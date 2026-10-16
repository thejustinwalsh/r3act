use std::collections::BTreeMap;

use oxc_allocator::Allocator;
use oxc_ast::ast::{BinaryOperator, Expression, LogicalOperator, UnaryOperator};
use oxc_parser::Parser;
use oxc_span::SourceType;

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

fn owner_kernel_expression(
    source: &str,
    references: &[StateReference],
    slot_by_site: &BTreeMap<String, usize>,
) -> Option<String> {
    fn visit(expression: &Expression<'_>, identifiers: &mut Vec<(u32, u32)>) -> bool {
        match expression {
            Expression::NumericLiteral(_)
            | Expression::StringLiteral(_)
            | Expression::BooleanLiteral(_)
            | Expression::NullLiteral(_) => true,
            Expression::Identifier(identifier) => {
                identifiers.push((identifier.span.start, identifier.span.end));
                true
            }
            Expression::TemplateLiteral(template) => {
                template.expressions.iter().all(|expression| visit(expression, identifiers))
            }
            Expression::ParenthesizedExpression(parenthesized) => {
                visit(&parenthesized.expression, identifiers)
            }
            Expression::UnaryExpression(unary) => {
                matches!(
                    unary.operator,
                    UnaryOperator::UnaryPlus
                        | UnaryOperator::UnaryNegation
                        | UnaryOperator::LogicalNot
                        | UnaryOperator::BitwiseNot
                ) && visit(&unary.argument, identifiers)
            }
            Expression::BinaryExpression(binary) => {
                !matches!(binary.operator, BinaryOperator::In | BinaryOperator::Instanceof)
                    && visit(&binary.left, identifiers)
                    && visit(&binary.right, identifiers)
            }
            Expression::LogicalExpression(logical) => {
                matches!(
                    logical.operator,
                    LogicalOperator::Or | LogicalOperator::And | LogicalOperator::Coalesce
                ) && visit(&logical.left, identifiers)
                    && visit(&logical.right, identifiers)
            }
            Expression::ConditionalExpression(conditional) => {
                visit(&conditional.test, identifiers)
                    && visit(&conditional.consequent, identifiers)
                    && visit(&conditional.alternate, identifiers)
            }
            // Calls, member access, assignment, update, arrays, objects, casts,
            // globals and every syntax form outside this whitelist stay on v2.
            _ => false,
        }
    }

    let allocator = Allocator::default();
    let expression = Parser::new(&allocator, source, SourceType::tsx())
        .parse_expression()
        .ok()?;
    let mut identifier_spans = Vec::new();
    if !visit(&expression, &mut identifier_spans) {
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

pub(super) fn emit_owner_update_program(
    owner_program_id: &str,
    ordered_layout_site_ids: &[&str],
    sinks: &[&Sink],
) -> Option<String> {
    if sinks.is_empty()
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
        let mut case_body = String::new();
        for (sink_index, sink) in sinks.iter().enumerate() {
            if !sink.source_sites.iter().any(|site| site.as_str() == *slot_site_id) {
                continue;
            }
            let bit = 1u32 << sink_index;
            let expression = &rewritten_expressions[sink_index];
            case_body.push_str(&format!(
                "if ((rowState.seenMask & {bit}) === 0) {{ rowState.seenMask |= {bit}; const next = ({expression}); const sinkState = rowState.sinks[{sink_index}]; const last = sinkState.lastValue; const same = last === next ? (last !== 0 || 1 / last === 1 / next) : (last !== last && next !== next); if (!same) {{ stagedRows[stagedCount] = rowIndex; stagedSinkIds[stagedCount] = {sink_index}; stagedValues[stagedCount] = next; stagedCount++; }} }}"
            ));
        }
        switch_cases.push_str(&format!("case {slot_index}: {{{case_body} break;}}"));
    }
    Some(format!(
        "{{ schemaVersion: 1, programId: {owner_id}, slotCount: {}, sinkIds: [{sink_ids}], executeCut: function(changedRows, changedSlots, changeCount, rowStates, stagedRows, stagedSinkIds, stagedValues) {{ let stagedCount = 0; for (let changeIndex = 0; changeIndex < changeCount; changeIndex++) {{ const rowIndex = changedRows[changeIndex]; const rowState = rowStates[rowIndex]; switch (changedSlots[changeIndex]) {{ {switch_cases} }} }} return stagedCount; }} }}",
        ordered_layout_site_ids.len(),
    ))
}

