use std::collections::BTreeMap;

use oxc_allocator::Allocator;
use oxc_ast::ast::{
    BinaryOperator, Expression, IdentifierReference, LogicalOperator, UnaryOperator,
};
use oxc_parser::Parser;
use oxc_span::SourceType;
use serde_json::{Value, json};

use crate::numeric_expression_dag;

#[derive(Clone, Debug)]
pub(super) struct Sink {
    pub(super) owner_program_id: String,
    pub(super) sink_id: String,
    pub(super) source_sites: Vec<String>,
    pub(super) expression: String,
    pub(super) references: Vec<StateReference>,
}

#[derive(Clone, Debug)]
pub(super) struct StateReference {
    pub(super) start: u32,
    pub(super) end: u32,
    pub(super) site_id: String,
}

#[derive(Clone, Copy)]
pub(super) enum ClosedExpressionPolicy {
    Primitive,
    PrimitiveOrArray,
}

pub(super) fn visit_closed_primitive_expression(
    expression: &Expression<'_>,
    policy: ClosedExpressionPolicy,
    identifier: &mut impl FnMut(&IdentifierReference<'_>) -> bool,
) -> bool {
    match expression {
        Expression::NumericLiteral(_)
        | Expression::StringLiteral(_)
        | Expression::BooleanLiteral(_)
        | Expression::NullLiteral(_) => true,
        Expression::Identifier(reference) => identifier(reference),
        Expression::ArrayExpression(array)
            if matches!(policy, ClosedExpressionPolicy::PrimitiveOrArray) =>
        {
            array.elements.iter().all(|element| {
                element.as_expression().is_some_and(|expression| {
                    visit_closed_primitive_expression(expression, policy, identifier)
                })
            })
        }
        Expression::TemplateLiteral(template) => template
            .expressions
            .iter()
            .all(|expression| visit_closed_primitive_expression(expression, policy, identifier)),
        Expression::ParenthesizedExpression(parenthesized) => {
            visit_closed_primitive_expression(&parenthesized.expression, policy, identifier)
        }
        Expression::UnaryExpression(unary) => {
            matches!(
                unary.operator,
                UnaryOperator::UnaryPlus
                    | UnaryOperator::UnaryNegation
                    | UnaryOperator::LogicalNot
                    | UnaryOperator::BitwiseNot
            ) && visit_closed_primitive_expression(&unary.argument, policy, identifier)
        }
        Expression::BinaryExpression(binary) => {
            !matches!(
                binary.operator,
                BinaryOperator::In | BinaryOperator::Instanceof
            ) && visit_closed_primitive_expression(&binary.left, policy, identifier)
                && visit_closed_primitive_expression(&binary.right, policy, identifier)
        }
        Expression::LogicalExpression(logical) => {
            matches!(
                logical.operator,
                LogicalOperator::Or | LogicalOperator::And | LogicalOperator::Coalesce
            ) && visit_closed_primitive_expression(&logical.left, policy, identifier)
                && visit_closed_primitive_expression(&logical.right, policy, identifier)
        }
        Expression::ConditionalExpression(conditional) => {
            visit_closed_primitive_expression(&conditional.test, policy, identifier)
                && visit_closed_primitive_expression(&conditional.consequent, policy, identifier)
                && visit_closed_primitive_expression(&conditional.alternate, policy, identifier)
        }
        _ => false,
    }
}

fn owner_kernel_expression(
    source: &str,
    references: &[StateReference],
    slot_by_site: &BTreeMap<String, usize>,
) -> Option<String> {
    let allocator = Allocator::default();
    let expression = Parser::new(&allocator, source, SourceType::tsx())
        .parse_expression()
        .ok()?;
    let mut identifier_spans = Vec::new();
    if !visit_closed_primitive_expression(
        &expression,
        ClosedExpressionPolicy::Primitive,
        &mut |identifier| {
            identifier_spans.push((identifier.span.start, identifier.span.end));
            true
        },
    ) {
        return None;
    }

    let reference_by_span: BTreeMap<_, _> = references
        .iter()
        .map(|reference| ((reference.start, reference.end), reference))
        .collect();
    let mut replacements = Vec::with_capacity(identifier_spans.len());
    for (start, end) in identifier_spans {
        let reference = reference_by_span.get(&(start, end))?;
        let slot = slot_by_site.get(&reference.site_id)?;
        replacements.push((start as usize, end as usize, *slot));
    }
    if replacements.len() != references.len() {
        return None;
    }
    replacements.sort_by_key(|(start, _, _)| *start);

    let mut output = String::with_capacity(source.len() + replacements.len() * 40);
    let mut cursor = 0;
    for (start, end, slot) in replacements {
        if start < cursor || end > source.len() {
            return None;
        }
        output.push_str(&source[cursor..start]);
        output.push_str(&format!("rowState.inputValues[{slot}]"));
        cursor = end;
    }
    output.push_str(&source[cursor..]);
    Some(output)
}

pub(super) fn primitive_output_expression(source: &str) -> bool {
    let allocator = Allocator::default();
    Parser::new(&allocator, source, SourceType::tsx())
        .parse_expression()
        .ok()
        .is_some_and(|expression| {
            visit_closed_primitive_expression(
                &expression,
                ClosedExpressionPolicy::Primitive,
                &mut |_| true,
            )
        })
}

/** Emit an executable data proof using the same state-reference cut as the owner kernel. */
pub(super) fn closed_numeric_expression(sink: &Sink) -> Option<String> {
    let allocator = Allocator::default();
    let expression = Parser::new(&allocator, &sink.expression, SourceType::tsx())
        .parse_expression()
        .ok()?;
    let reference_by_span: BTreeMap<_, _> = sink.references.iter().map(|reference| {
        ((reference.start, reference.end), reference.site_id.as_str())
    }).collect();
    let slot_by_site: BTreeMap<_, _> = sink.source_sites.iter().enumerate()
        .map(|(index, site)| (site.as_str(), index)).collect();
    let mut seen_references = 0usize;
    let mut node_count = 0usize;
    fn visit(
        expression: &Expression<'_>,
        reference_by_span: &BTreeMap<(u32, u32), &str>,
        slot_by_site: &BTreeMap<&str, usize>,
        seen_references: &mut usize,
        node_count: &mut usize,
        depth: usize,
    ) -> Option<Value> {
        *node_count += 1;
        if depth > 32 || *node_count > 256 { return None; }
        let child = |expression: &Expression<'_>, seen_references: &mut usize,
                     node_count: &mut usize| {
            visit(expression, reference_by_span, slot_by_site,
                seen_references, node_count, depth + 1)
        };
        match expression {
            Expression::NumericLiteral(literal) if literal.value.is_finite() =>
                Some(json!({ "kind": "literal", "value": literal.value })),
            Expression::StringLiteral(literal) =>
                Some(json!({ "kind": "literal", "value": literal.value.as_str() })),
            Expression::BooleanLiteral(literal) =>
                Some(json!({ "kind": "literal", "value": literal.value })),
            Expression::NullLiteral(_) => Some(json!({ "kind": "literal", "value": null })),
            Expression::Identifier(identifier) => {
                let site = reference_by_span.get(&(identifier.span.start, identifier.span.end))?;
                let index = slot_by_site.get(site)?;
                *seen_references += 1;
                Some(json!({ "kind": "input", "index": index }))
            }
            Expression::ParenthesizedExpression(parenthesized) =>
                child(&parenthesized.expression, seen_references, node_count),
            Expression::UnaryExpression(unary) if matches!(unary.operator,
                UnaryOperator::UnaryPlus | UnaryOperator::UnaryNegation |
                UnaryOperator::LogicalNot | UnaryOperator::BitwiseNot) => {
                let argument = child(&unary.argument, seen_references, node_count)?;
                Some(json!({ "kind": "unary", "operator": unary.operator.as_str(), "argument": argument }))
            }
            Expression::BinaryExpression(binary) if !matches!(binary.operator,
                BinaryOperator::In | BinaryOperator::Instanceof) => {
                let left = child(&binary.left, seen_references, node_count)?;
                let right = child(&binary.right, seen_references, node_count)?;
                Some(json!({ "kind": "binary", "operator": binary.operator.as_str(), "left": left, "right": right }))
            }
            Expression::LogicalExpression(logical) if matches!(logical.operator,
                LogicalOperator::Or | LogicalOperator::And | LogicalOperator::Coalesce) => {
                let left = child(&logical.left, seen_references, node_count)?;
                let right = child(&logical.right, seen_references, node_count)?;
                Some(json!({ "kind": "logical", "operator": logical.operator.as_str(), "left": left, "right": right }))
            }
            Expression::ConditionalExpression(conditional) => {
                let test = child(&conditional.test, seen_references, node_count)?;
                let consequent = child(&conditional.consequent, seen_references, node_count)?;
                let alternate = child(&conditional.alternate, seen_references, node_count)?;
                Some(json!({ "kind": "conditional", "test": test,
                    "consequent": consequent, "alternate": alternate }))
            }
            Expression::TemplateLiteral(template) => {
                let parts = template.quasis.iter().map(|quasi|
                    quasi.value.cooked.as_ref().map(|value| value.as_str())
                ).collect::<Option<Vec<_>>>()?;
                let expressions = template.expressions.iter().map(|expression|
                    child(expression, seen_references, node_count)
                ).collect::<Option<Vec<_>>>()?;
                Some(json!({ "kind": "template", "parts": parts,
                    "expressions": expressions }))
            }
            _ => None,
        }
    }
    let value = visit(&expression, &reference_by_span, &slot_by_site,
        &mut seen_references, &mut node_count, 0)?;
    if seen_references != sink.references.len() { return None; }
    serde_json::to_string(&value).ok()
}

pub(super) fn emit_owner_update_program(
    owner_program_id: &str,
    ordered_layout_site_ids: &[&str],
    sinks: &[&Sink],
    schema_version: u8,
) -> Option<String> {
    if !matches!(schema_version, 4 | 5)
        || sinks.is_empty()
        || sinks.len() > 30
        || ordered_layout_site_ids.is_empty()
        || ordered_layout_site_ids.len() > 30
    {
        return None;
    }
    let slot_by_site: BTreeMap<_, _> = ordered_layout_site_ids
        .iter()
        .enumerate()
        .map(|(slot, site_id)| ((*site_id).to_owned(), slot))
        .collect();
    if sinks.iter().any(|sink| {
        sink.references
            .iter()
            .any(|reference| !slot_by_site.contains_key(&reference.site_id))
    }) {
        return None;
    }
    let rewritten_expressions: Option<Vec<_>> = sinks
        .iter()
        .map(|sink| owner_kernel_expression(&sink.expression, &sink.references, &slot_by_site))
        .collect();
    let rewritten_expressions = rewritten_expressions?;
    let owner_id = serde_json::to_string(owner_program_id).unwrap_or_default();
    let sink_ids = sinks
        .iter()
        .map(|sink| serde_json::to_string(&sink.sink_id).unwrap_or_default())
        .collect::<Vec<_>>()
        .join(", ");
    let mut switch_cases = String::new();
    for (slot_index, slot_site_id) in ordered_layout_site_ids.iter().enumerate() {
        let affected_sinks = sinks.iter().enumerate().filter_map(|(index, sink)| {
            sink.source_sites.iter().any(|site| site.as_str() == *slot_site_id).then_some(index)
        }).collect::<Vec<_>>();
        let (declarations, case_expressions) = numeric_expression_dag::lower_case(
            &rewritten_expressions, &affected_sinks, ordered_layout_site_ids.len(),
        ).unwrap_or_else(|| (String::new(), rewritten_expressions.clone()));
        let mut case_body = String::new();
        case_body.push_str(&declarations);
        for (sink_index, sink) in sinks.iter().enumerate() {
            if !sink
                .source_sites
                .iter()
                .any(|site| site.as_str() == *slot_site_id)
            {
                continue;
            }
            let bit = 1u32 << sink_index;
            let expression = &case_expressions[sink_index];
            case_body.push_str(&format!(
                "if ((rowState.seenMask & {bit}) === 0) {{ rowState.seenMask |= {bit}; const next = ({expression}); const sinkState = rowState.sinks[{sink_index}]; const last = sinkState.lastValue; const same = last === next ? (typeof next !== 'number' || (typeof last === 'number' && (last !== 0 || 1 / last === 1 / next))) : (typeof last === 'number' && typeof next === 'number' && last !== last && next !== next); if (!same) {{ stagedInputIndices[stagedCount] = changeIndex; stagedSinkIds[stagedCount] = {sink_index}; stagedValues[stagedCount] = next; stagedCount++; }} }}"
            ));
        }
        switch_cases.push_str(&format!("case {slot_index}: {{{case_body} break;}}"));
    }
    Some(format!(
        "{{ schemaVersion: {schema_version}, programId: {owner_id}, slotCount: {}, sinkIds: [{sink_ids}], executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues, inputStart = 0, outputStart = 0) {{ let stagedCount = outputStart; for (let localIndex = 0; localIndex < changeCount; localIndex++) {{ const changeIndex = inputStart + localIndex; const rowState = rowStates[changeIndex]!; switch (changedSlots[changeIndex]) {{ {switch_cases} }} }} return stagedCount - outputStart; }} }}",
        ordered_layout_site_ids.len(),
    ))
}

#[cfg(test)]
mod closed_expression_tests {
    use super::{Sink, StateReference, closed_numeric_expression};
    use serde_json::{Value, json};

    fn sink(expression: &str, references: &[(u32, u32, &str)]) -> Sink {
        Sink {
            owner_program_id: "scene".into(),
            sink_id: "output".into(),
            source_sites: vec!["x".into(), "y".into()],
            expression: expression.into(),
            references: references.iter().map(|(start, end, site_id)| StateReference {
                start: *start, end: *end, site_id: (*site_id).into(),
            }).collect(),
        }
    }

    #[test]
    fn emits_closed_inputs_in_source_site_order() {
        let actual: Value = serde_json::from_str(&closed_numeric_expression(
            &sink("y + x", &[(0, 1, "y"), (4, 5, "x")]),
        ).expect("closed sum")).expect("JSON expression");
        assert_eq!(actual, json!({
            "kind": "binary", "operator": "+",
            "left": {"kind": "input", "index": 1},
            "right": {"kind": "input", "index": 0},
        }));
    }

    #[test]
    fn emits_conditional_template_and_declines_opaque_outputs() {
        let actual: Value = serde_json::from_str(&closed_numeric_expression(
            &sink("x ? `v=${y}` : 0", &[(0, 1, "x"), (9, 10, "y")]),
        ).expect("closed conditional template")).expect("JSON expression");
        assert_eq!(actual, json!({
            "kind": "conditional",
            "test": {"kind": "input", "index": 0},
            "consequent": {"kind": "template", "parts": ["v=", ""],
                "expressions": [{"kind": "input", "index": 1}]},
            "alternate": {"kind": "literal", "value": 0.0},
        }));
        assert!(closed_numeric_expression(&sink("[x]", &[(1, 2, "x")])).is_none());
        assert!(closed_numeric_expression(&sink("x.toString()", &[(0, 1, "x")])).is_none());
    }
}
