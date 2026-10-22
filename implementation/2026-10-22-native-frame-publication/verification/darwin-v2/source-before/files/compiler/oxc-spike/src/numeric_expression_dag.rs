use std::{collections::BTreeMap, ops::Range};

use oxc_allocator::Allocator;
use oxc_ast::ast::{BinaryOperator, Expression, UnaryOperator};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType};

const MAX_NODES: usize = 2048;
const MAX_SOURCE_BYTES: usize = 32 * 1024;
const MAX_SHARED_NODES: usize = 128;

#[derive(Clone, Eq, PartialEq, Ord, PartialOrd)]
enum Key {
    Input(usize),
    Literal(u64),
    Unary(&'static str, Box<Key>),
    Binary(&'static str, Box<Key>, Box<Key>),
}

#[derive(Clone)]
struct Node {
    key: Key,
    start: usize,
    end: usize,
    children: Vec<Node>,
    height: usize,
}

struct Occurrence {
    count: usize,
    consumer_mask: u32,
    representative: Node,
    sink: usize,
}

struct Scanner<'a> {
    source: &'a str,
    slot_count: usize,
    input_syntax: InputSyntax,
    nodes: usize,
    roots: Vec<Node>,
}

#[derive(Clone, Copy)]
enum InputSyntax { OwnerRow, FlatRange, BatchBuffers(usize, usize) }

impl InputSyntax {
    fn reference(self, slot: usize) -> String {
        match self {
            Self::OwnerRow => format!("rowState.inputValues[{slot}]"),
            Self::FlatRange => format!("inputValues[$r3actInputBase + {slot}]"),
            Self::BatchBuffers(shared, _) if slot < shared =>
                format!("sharedInputs[{slot}]"),
            Self::BatchBuffers(shared, varying) =>
                format!("varyingInputs[row * {varying} + {}]", slot - shared),
        }
    }
}

impl Scanner<'_> {
    fn visit(&mut self, expression: &Expression<'_>, depth: usize) -> Option<Node> {
        self.nodes += 1;
        if self.nodes > MAX_NODES || depth > 32 {
            return None;
        }
        let span = expression.span();
        let (start, end) = (span.start as usize, span.end as usize);
        match expression {
            Expression::NumericLiteral(literal) => Some(Node {
                key: Key::Literal(literal.value.to_bits()), start, end,
                children: Vec::new(), height: 0,
            }),
            Expression::ComputedMemberExpression(member) if !member.optional => {
                let slot = (0..self.slot_count).find(|slot| {
                    self.source.get(start..end) == Some(self.input_syntax.reference(*slot).as_str())
                })?;
                let valid = match self.input_syntax {
                    InputSyntax::OwnerRow => matches!(&member.object,
                        Expression::StaticMemberExpression(static_member)
                        if !static_member.optional && static_member.property.name.as_str() == "inputValues"
                        && matches!(&static_member.object, Expression::Identifier(identifier)
                            if identifier.name.as_str() == "rowState"))
                        && matches!(&member.expression, Expression::NumericLiteral(literal)
                            if literal.value == slot as f64),
                    InputSyntax::FlatRange => matches!(&member.object,
                        Expression::Identifier(identifier) if identifier.name.as_str() == "inputValues"),
                    InputSyntax::BatchBuffers(shared, _) => {
                        if slot < shared {
                            matches!(&member.object, Expression::Identifier(identifier)
                                if identifier.name.as_str() == "sharedInputs")
                        } else {
                            matches!(&member.object, Expression::Identifier(identifier)
                                if identifier.name.as_str() == "varyingInputs")
                        }
                    }
                };
                if !valid {
                    return None;
                }
                Some(Node { key: Key::Input(slot), start, end,
                    children: Vec::new(), height: 0 })
            }
            Expression::ParenthesizedExpression(parenthesized) => {
                let mut child = self.visit(&parenthesized.expression, depth + 1)?;
                child.start = start;
                child.end = end;
                Some(child)
            }
            Expression::UnaryExpression(unary) => {
                let argument = self.visit(&unary.argument, depth + 1);
                if let Some(argument) = argument {
                    if matches!(unary.operator, UnaryOperator::UnaryPlus |
                        UnaryOperator::UnaryNegation | UnaryOperator::BitwiseNot) {
                        return Some(Node {
                            key: Key::Unary(unary.operator.as_str(), Box::new(argument.key.clone())),
                            start, end, height: argument.height + 1, children: vec![argument],
                        });
                    }
                    self.roots.push(argument);
                }
                None
            }
            Expression::BinaryExpression(binary) => {
                let left = self.visit(&binary.left, depth + 1);
                let right = self.visit(&binary.right, depth + 1);
                if matches!(binary.operator,
                    BinaryOperator::Addition | BinaryOperator::Subtraction |
                    BinaryOperator::Multiplication | BinaryOperator::Division |
                    BinaryOperator::Remainder | BinaryOperator::Exponential |
                    BinaryOperator::ShiftLeft | BinaryOperator::ShiftRight |
                    BinaryOperator::ShiftRightZeroFill | BinaryOperator::BitwiseOR |
                    BinaryOperator::BitwiseXOR | BinaryOperator::BitwiseAnd)
                    && let (Some(left), Some(right)) = (left.as_ref(), right.as_ref())
                {
                    return Some(Node {
                        key: Key::Binary(binary.operator.as_str(),
                            Box::new(left.key.clone()), Box::new(right.key.clone())),
                        start, end, height: left.height.max(right.height) + 1,
                        children: vec![left.clone(), right.clone()],
                    });
                }
                if let Some(left) = left { self.roots.push(left); }
                if let Some(right) = right { self.roots.push(right); }
                None
            }
            Expression::LogicalExpression(logical) => {
                if let Some(left) = self.visit(&logical.left, depth + 1) { self.roots.push(left); }
                if let Some(right) = self.visit(&logical.right, depth + 1) { self.roots.push(right); }
                None
            }
            Expression::ConditionalExpression(conditional) => {
                for child in [&conditional.test, &conditional.consequent, &conditional.alternate] {
                    if let Some(node) = self.visit(child, depth + 1) { self.roots.push(node); }
                }
                None
            }
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{MAX_SOURCE_BYTES, lower_all, lower_batch_buffers, lower_case};

    #[test]
    fn batch_hoists_store_only_trees_and_keeps_varying_work_in_row() {
        let shared = "sharedInputs[0] + sharedInputs[1]";
        let expressions = vec![
            format!("({shared}) * varyingInputs[row * 1 + 0]"),
            format!("({shared}) / varyingInputs[row * 1 + 0]"),
        ];
        let (before, within, rewritten) = lower_batch_buffers(&expressions, 2, 1).unwrap();
        assert!(before.contains(shared));
        assert!(!before.contains("varyingInputs"));
        assert!(rewritten.iter().all(|source| source.contains("$r3actDag")));
        assert!(within.is_empty());
    }

    #[test]
    fn batch_reuses_varying_tree_and_preserves_grouping() {
        let sum = "sharedInputs[0] + varyingInputs[row * 1 + 0]";
        let expressions = vec![format!("({sum}) * 2"), format!("({sum}) / 3")];
        let (before, within, rewritten) = lower_batch_buffers(&expressions, 1, 1).unwrap();
        assert!(before.is_empty());
        assert!(within.contains(sum));
        assert!(rewritten.iter().all(|source| source.contains("$r3actDag")));
        let grouped = vec!["sharedInputs[0] - (sharedInputs[1] - sharedInputs[2])".to_owned(),
            "(sharedInputs[0] - sharedInputs[1]) - sharedInputs[2]".to_owned()];
        let (before, _, _) = lower_batch_buffers(&grouped, 3, 0).unwrap();
        assert!(before.contains("sharedInputs[1] - sharedInputs[2]"));
        assert!(before.contains("sharedInputs[0] - sharedInputs[1]"));
    }

    #[test]
    fn batch_buffers_share_nested_subtrees_in_dependency_order() {
        let sum = "sharedInputs[0] + sharedInputs[1]";
        let product = format!("({sum}) * varyingInputs[row * 1 + 0]");
        let expressions = vec![format!("({product}) + 1"),
            format!("({product}) / 2"), format!("({sum}) - 3")];
        let (before, within, rewritten) = lower_batch_buffers(&expressions, 2, 1).unwrap();
        assert!(before.contains("const $r3actDag0"));
        assert!(before.contains(sum));
        assert!(!before.contains("varyingInputs"));
        assert!(within.contains("const $r3actDag"));
        assert!(within.contains("$r3actDag0"));
        let varying_name = within.split(" =").next().unwrap().trim_start_matches("const ");
        assert!(rewritten[0].contains(varying_name));
        assert!(rewritten[1].contains(varying_name));
        assert!(rewritten[2].contains("$r3actDag"));
        assert!(!within.contains("seenMask"));
    }

    #[test]
    fn batch_buffers_keep_structural_and_input_slot_boundaries() {
        let expressions = vec![
            "sharedInputs[0] - (varyingInputs[row * 1 + 0] - sharedInputs[1])".to_owned(),
            "(sharedInputs[0] - varyingInputs[row * 1 + 0]) - sharedInputs[1]".to_owned(),
        ];
        let (before, within, rewritten) = lower_batch_buffers(&expressions, 2, 1).unwrap();
        assert!(before.is_empty());
        assert!(within.is_empty());
        assert_eq!(rewritten, expressions);
        let wrong = vec!["sharedInputs[2] + 1".to_owned(); 2];
        let (before, within, rewritten) = lower_batch_buffers(&wrong, 2, 1).unwrap();
        assert!(before.is_empty());
        assert!(within.is_empty());
        assert_eq!(rewritten, wrong);
    }

    #[test]
    fn shares_flat_range_expression_without_owner_masks() {
        let sum = "inputValues[$r3actInputBase + 0] + inputValues[$r3actInputBase + 1]";
        let expressions = vec![format!("({sum}) * 2"), format!("({sum}) / 3")];
        let (declarations, rewritten) = lower_all(&expressions, 2).unwrap();
        assert!(declarations.contains("const $r3actDag0"));
        assert!(!declarations.contains("rowState.seenMask"));
        assert!(rewritten.iter().all(|expression| expression.contains("$r3actDag0")));
    }

    #[test]
    fn shares_exact_numeric_tree_with_consumer_mask() {
        let sum = "rowState.inputValues[0] + rowState.inputValues[1]";
        let expressions = vec![
            format!("({sum}) * 2"),
            format!("({sum}) / 3"),
            "rowState.inputValues[1] + 4".to_owned(),
        ];
        let (declarations, rewritten) = lower_case(&expressions, &[0, 1, 2], 2).unwrap();
        assert!(declarations.contains("(rowState.seenMask & 3) !== 3"));
        assert!(declarations.contains("rowState.inputValues[0] + rowState.inputValues[1]"));
        assert!(declarations.contains(": 0;"));
        assert!(rewritten[0].contains("$r3actDag0"));
        assert!(rewritten[1].contains("$r3actDag0"));
        assert_eq!(rewritten[2], expressions[2]);
    }

    #[test]
    fn orders_nested_temporaries_and_propagates_masks() {
        let sum = "rowState.inputValues[0] + rowState.inputValues[1]";
        let product = format!("({sum}) * 2");
        let expressions = vec![
            format!("({product}) + 1"),
            format!("({product}) / 2"),
            format!("({sum}) + 3"),
        ];
        let (declarations, _) = lower_case(&expressions, &[0, 1, 2], 2).unwrap();
        let sum_declaration = declarations.find("const $r3actDag0").unwrap();
        let product_declaration = declarations.find("const $r3actDag1").unwrap();
        assert!(sum_declaration < product_declaration);
        assert!(declarations[sum_declaration..product_declaration]
            .contains("(rowState.seenMask & 7) !== 7"));
        assert!(declarations[product_declaration..]
            .contains("(rowState.seenMask & 3) !== 3"));
        assert!(declarations[product_declaration..].contains("$r3actDag0"));
    }

    #[test]
    fn grouping_and_unknown_branches_do_not_intern() {
        let expressions = vec![
            "rowState.inputValues[0] - (rowState.inputValues[1] - rowState.inputValues[2])".to_owned(),
            "(rowState.inputValues[0] - rowState.inputValues[1]) - rowState.inputValues[2]".to_owned(),
            "rowState.inputValues[0] > 0 ? `x${rowState.inputValues[1]}` : 0".to_owned(),
        ];
        let (declarations, rewritten) = lower_case(&expressions, &[0, 1, 2], 3).unwrap();
        assert!(declarations.is_empty());
        assert_eq!(rewritten, expressions);
    }

    #[test]
    fn keeps_signed_zero_operator_identity() {
        let expressions = vec![
            "-0 * rowState.inputValues[0]".to_owned(),
            "+0 * rowState.inputValues[0]".to_owned(),
        ];
        let (declarations, rewritten) = lower_case(&expressions, &[0, 1], 1).unwrap();
        assert!(declarations.is_empty());
        assert_eq!(rewritten, expressions);
    }

    #[test]
    fn does_not_share_unproven_input_or_unbounded_source() {
        let expressions = vec!["other.inputValues[0] + 1".to_owned(); 2];
        let (declarations, rewritten) = lower_case(&expressions, &[0, 1], 1).unwrap();
        assert!(declarations.is_empty());
        assert_eq!(rewritten, expressions);
        assert!(lower_case(&["1".repeat(MAX_SOURCE_BYTES + 1)], &[0], 1).is_none());
    }
}

fn record(node: &Node, sink: usize, entries: &mut BTreeMap<Key, Occurrence>) {
    if node.height > 0 {
        let entry = entries.entry(node.key.clone()).or_insert_with(|| Occurrence {
            count: 0, consumer_mask: 0, representative: node.clone(), sink,
        });
        entry.count += 1;
        entry.consumer_mask |= 1u32 << sink;
    }
    for child in &node.children { record(child, sink, entries); }
}

fn shared_only(key: &Key, shared_count: usize) -> bool {
    match key {
        Key::Input(index) => *index < shared_count,
        Key::Literal(_) => true,
        Key::Unary(_, child) => shared_only(child, shared_count),
        Key::Binary(_, left, right) =>
            shared_only(left, shared_count) && shared_only(right, shared_count),
    }
}

pub(super) fn lower_batch_buffers(
    expressions: &[String], shared_count: usize, varying_count: usize,
) -> Option<(String, String, Vec<String>)> {
    let slot_count = shared_count.checked_add(varying_count)?;
    if slot_count > 32 || expressions.iter().map(String::len).sum::<usize>() > MAX_SOURCE_BYTES {
        return None;
    }
    let mut roots_by_sink = vec![Vec::new(); expressions.len()];
    let mut node_count = 0;
    for (sink, source) in expressions.iter().enumerate() {
        let allocator = Allocator::default();
        let expression = Parser::new(&allocator, source, SourceType::tsx()).parse_expression().ok()?;
        let mut scanner = Scanner { source, slot_count,
            input_syntax: InputSyntax::BatchBuffers(shared_count, varying_count),
            nodes: 0, roots: Vec::new() };
        if let Some(root) = scanner.visit(&expression, 0) { scanner.roots.push(root); }
        node_count += scanner.nodes;
        if node_count > MAX_NODES { return None; }
        roots_by_sink[sink] = scanner.roots;
    }
    let mut entries = BTreeMap::new();
    for (sink, roots) in roots_by_sink.iter().enumerate() {
        for root in roots { record(root, sink, &mut entries); }
    }
    let mut selected_nodes = entries.into_iter().filter(|(key, occurrence)|
        occurrence.representative.height > 0 &&
            (occurrence.count > 1 || shared_only(key, shared_count)))
        .collect::<Vec<_>>();
    if selected_nodes.len() > MAX_SHARED_NODES { return None; }
    selected_nodes.sort_by(|(left_key, left), (right_key, right)| {
        shared_only(right_key, shared_count).cmp(&shared_only(left_key, shared_count))
            .then_with(|| left.representative.height.cmp(&right.representative.height))
            .then_with(|| left_key.cmp(right_key))
    });
    let selected = selected_nodes.iter().enumerate().map(|(index, (key, _))|
        (key.clone(), index)).collect::<BTreeMap<_, _>>();
    let mut shared = String::new();
    let mut varying = String::new();
    for (index, (key, occurrence)) in selected_nodes.iter().enumerate() {
        let node = &occurrence.representative;
        let source = expressions.get(occurrence.sink)?;
        let expression = rewrite(source, node.start..node.end,
            std::slice::from_ref(node), &selected, true)?;
        let declaration = format!("const $r3actDag{index} = ({expression});");
        if shared_only(key, shared_count) { shared.push_str(&declaration); }
        else { varying.push_str(&declaration); }
    }
    let mut rewritten = Vec::with_capacity(expressions.len());
    for (sink, source) in expressions.iter().enumerate() {
        rewritten.push(rewrite(source, 0..source.len(), &roots_by_sink[sink], &selected, false)?);
    }
    Some((shared, varying, rewritten))
}

fn replacements(node: &Node, selected: &BTreeMap<Key, usize>,
    skip_root: bool, edits: &mut Vec<(usize, usize, usize)>) {
    if !skip_root && let Some(index) = selected.get(&node.key) {
        edits.push((node.start, node.end, *index));
        return;
    }
    for child in &node.children { replacements(child, selected, false, edits); }
}

fn rewrite(source: &str, range: Range<usize>, roots: &[Node],
    selected: &BTreeMap<Key, usize>, skip_root: bool) -> Option<String> {
    let mut edits = Vec::new();
    for root in roots { replacements(root, selected, skip_root, &mut edits); }
    edits.sort_by_key(|edit| edit.0);
    let mut output = String::with_capacity(range.end.checked_sub(range.start)?);
    let mut cursor = range.start;
    for (start, end, index) in edits {
        if start < cursor || end > range.end { return None; }
        output.push_str(source.get(cursor..start)?);
        output.push_str(&format!("$r3actDag{index}"));
        cursor = end;
    }
    output.push_str(source.get(cursor..range.end)?);
    Some(output)
}

pub(super) fn lower_case(
    expressions: &[String], affected_sinks: &[usize], slot_count: usize,
) -> Option<(String, Vec<String>)> {
    lower(expressions, affected_sinks, slot_count, InputSyntax::OwnerRow, false)
}

pub(super) fn lower_all(
    expressions: &[String], slot_count: usize,
) -> Option<(String, Vec<String>)> {
    lower(expressions, &(0..expressions.len()).collect::<Vec<_>>(), slot_count,
        InputSyntax::FlatRange, true)
}

fn lower(
    expressions: &[String], affected_sinks: &[usize], slot_count: usize,
    input_syntax: InputSyntax, all_outputs: bool,
) -> Option<(String, Vec<String>)> {
    if expressions.iter().map(String::len).sum::<usize>() > MAX_SOURCE_BYTES {
        return None;
    }
    let mut roots_by_sink = vec![Vec::new(); expressions.len()];
    let mut node_count = 0;
    for &sink in affected_sinks {
        let source = expressions.get(sink)?;
        let allocator = Allocator::default();
        let expression = Parser::new(&allocator, source, SourceType::tsx()).parse_expression().ok()?;
        let mut scanner = Scanner { source, slot_count, input_syntax, nodes: 0, roots: Vec::new() };
        if let Some(root) = scanner.visit(&expression, 0) { scanner.roots.push(root); }
        node_count += scanner.nodes;
        if node_count > MAX_NODES { return None; }
        roots_by_sink[sink] = scanner.roots;
    }
    let mut entries = BTreeMap::new();
    for &sink in affected_sinks {
        for root in &roots_by_sink[sink] { record(root, sink, &mut entries); }
    }
    let mut shared = entries.into_iter().filter(|(_, occurrence)| occurrence.count > 1)
        .collect::<Vec<_>>();
    if shared.is_empty() { return Some((String::new(), expressions.to_vec())); }
    if shared.len() > MAX_SHARED_NODES { return None; }
    shared.sort_by(|(left_key, left), (right_key, right)| {
        left.representative.height.cmp(&right.representative.height)
            .then_with(|| left_key.cmp(right_key))
    });
    let selected = shared.iter().enumerate().map(|(index, (key, _))|
        (key.clone(), index)).collect::<BTreeMap<_, _>>();
    let mut declarations = String::new();
    for (index, (_, occurrence)) in shared.iter().enumerate() {
        let node = &occurrence.representative;
        let source = expressions.get(occurrence.sink)?;
        let expression = rewrite(source, node.start..node.end,
            std::slice::from_ref(node), &selected, true)?;
        let mask = occurrence.consumer_mask;
        if all_outputs {
            declarations.push_str(&format!("const $r3actDag{index} = ({expression});"));
        } else {
            declarations.push_str(&format!(
                "const $r3actDag{index} = ((rowState.seenMask & {mask}) !== {mask}) ? ({expression}) : 0;"
            ));
        }
    }
    let mut rewritten = expressions.to_vec();
    for &sink in affected_sinks {
        rewritten[sink] = rewrite(&expressions[sink], 0..expressions[sink].len(),
            &roots_by_sink[sink], &selected, false)?;
    }
    Some((declarations, rewritten))
}
