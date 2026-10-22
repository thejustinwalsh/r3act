use serde_json::Value;

use crate::numeric_expression_dag;

pub(super) struct StoreDataExecution {
    pub(super) code: String,
    pub(super) descriptor: Value,
}

pub(super) fn numeric_expression(node: &Value, input_count: usize, depth: usize) -> Option<()> {
    if depth > 32 { return None; }
    match node.get("kind")?.as_str()? {
        "input" => {
            let index = usize::try_from(node.get("index")?.as_u64()?).ok()?;
            (index < input_count).then_some(())
        }
        "literal" => {
            node.get("value")?.as_f64().filter(|number| number.is_finite())?;
            Some(())
        }
        "unary" => {
            if !matches!(node.get("operator")?.as_str()?, "+" | "-" | "~") { return None; }
            numeric_expression(node.get("argument")?, input_count, depth + 1)
        }
        "binary" => {
            if !matches!(node.get("operator")?.as_str()?, "+" | "-" | "*" | "/" | "%" | "**" |
                "<<" | ">>" | ">>>" | "|" | "^" | "&") { return None; }
            numeric_expression(node.get("left")?, input_count, depth + 1)?;
            numeric_expression(node.get("right")?, input_count, depth + 1)
        }
        _ => None,
    }
}

fn emit_numeric_expression(node: &Value, input_count: usize, depth: usize) -> Option<String> {
    numeric_expression(node, input_count, depth)?;
    match node.get("kind")?.as_str()? {
        "input" => Some(format!("inputs[{}]", node.get("index")?.as_u64()?)),
        "literal" => Some(node.get("value")?.to_string()),
        "unary" => Some(format!("({}{})", node.get("operator")?.as_str()?,
            emit_numeric_expression(node.get("argument")?, input_count, depth + 1)?)),
        "binary" => Some(format!("({} {} {})",
            emit_numeric_expression(node.get("left")?, input_count, depth + 1)?,
            node.get("operator")?.as_str()?,
            emit_numeric_expression(node.get("right")?, input_count, depth + 1)?)),
        _ => None,
    }
}

pub(super) fn emit(program: &Value) -> Option<StoreDataExecution> {
    let schema = program.get("schemaVersion")?.as_u64()?;
    if !matches!(schema, 1 | 2 | 3 | 5 | 6 | 7) { return None; }
    let component_id = program.get("componentProgramId")?.as_str()?;
    let revision = program.get("moduleRevision")?.as_str()?;
    let host = program.get("host")?;
    let empty_primitive_group = schema == 5;
    if empty_primitive_group {
        if host.get("tag")?.as_str()? != "group" ||
            !host.get("children")?.as_array()?.is_empty() { return None; }
    } else if !host.get("child")?.is_null() { return None; }
    let input_count = if schema == 1 { 1 } else if matches!(schema, 5 | 6 | 7) {
        let store_count = program.get("inputs")?.as_array()?.iter().try_fold(0usize, |count, input| {
            count.checked_add(input.get("paths")?.as_array()?.len())
        })?;
        if schema == 7 {
            store_count.checked_add(program.get("stateSites")?.as_array()?.len())?
        } else { store_count }
    } else { program.get("inputs")?.as_array()?.len() };
    if !(1..=32).contains(&input_count) { return None; }
    let props = host.get("props")?.as_array()?;
    if props.is_empty() || props.len() > 32 { return None; }
    let mut expressions = Vec::new();
    for prop in props {
        let pair = prop.as_array()?;
        if pair.len() != 2 { return None; }
        pair[0].as_str()?;
        if empty_primitive_group && pair[1].get("kind")?.as_str()? == "literal" {
            let value = pair[1].get("value")?;
            if !value.is_null() && !value.is_boolean() && !value.is_string() &&
                !value.as_f64().is_some_and(|number| number.is_finite()) { return None; }
            if value.is_number() {
                expressions.push(emit_numeric_expression(&pair[1], input_count, 0)?);
            }
        } else {
            numeric_expression(&pair[1], input_count, 0)?;
            expressions.push(emit_numeric_expression(&pair[1], input_count, 0)?);
        }
    }
    if expressions.is_empty() { return None; }
    let descriptor = serde_json::json!({
        "schemaVersion": 2,
        "kind": "owned-data",
        "componentProgramId": component_id,
        "moduleRevision": revision,
    });
    let mut code = descriptor.to_string();
    if let Some((declarations, rewritten)) =
        numeric_expression_dag::lower_scalar_buffers(&expressions, input_count)
    {
        let mut body = String::from("(inputs, outputs) => {");
        body.push_str(&declarations);
        for (index, expression) in rewritten.iter().enumerate() {
            body.push_str(&format!("outputs[{index}] = {expression};"));
        }
        body.push('}');
        if body.len() <= 32 * 1024 && code.pop() == Some('}') {
            code.push_str(",\"numericKernel\":");
            code.push_str(&body);
            code.push('}');
        }
    }
    Some(StoreDataExecution { code, descriptor })
}

#[cfg(test)]
mod tests {
    use super::emit;

    #[test]
    fn emits_data_marker_without_callback_for_numeric_tree() {
        let input = serde_json::json!({
            "schemaVersion": 2, "componentProgramId": "component", "moduleRevision": "rev",
            "inputs": [{}, {}], "host": {"child": null, "props": [
                ["position-x", {"kind":"binary","operator":"*","left":{
                    "kind":"binary","operator":"+","left":{"kind":"input","index":0},
                    "right":{"kind":"input","index":1}},"right":{"kind":"literal","value":2}}],
                ["position-y", {"kind":"binary","operator":"/","left":{
                    "kind":"binary","operator":"+","left":{"kind":"input","index":0},
                    "right":{"kind":"input","index":1}},"right":{"kind":"literal","value":3}}]
            ]}
        });
        let execution = emit(&input).unwrap();
        assert_eq!(execution.descriptor["kind"], "owned-data");
        assert_eq!(execution.descriptor["schemaVersion"], 2);
        assert_eq!(execution.descriptor.as_object().unwrap().len(), 4);
        assert_eq!(execution.descriptor["componentProgramId"], "component");
        assert!(!execution.code.contains("executeRange"));
        assert!(!execution.code.contains("inputValues"));
        assert!(execution.code.contains("\"numericKernel\":(inputs, outputs) => {"));
        assert!(execution.code.contains("const $r3actDag0 ="));
        assert!(execution.code.contains("inputs[0] + inputs[1]"));
        assert!(execution.code.contains("outputs[0] = ($r3actDag0 * 2);"));
        assert!(execution.code.contains("outputs[1] = ($r3actDag0 / 3);"));
    }

    #[test]
    fn declines_aggregate_and_short_circuit_forms() {
        let mut input = serde_json::json!({
            "schemaVersion": 3, "componentProgramId": "component", "moduleRevision": "rev",
            "inputs": [{}], "host": {"child": null, "props": [
                ["position", {"kind":"tuple","items":[]}]
            ]}
        });
        assert!(emit(&input).is_none());
        input["host"]["props"][0][1] = serde_json::json!({"kind":"logical",
            "operator":"&&","left":{"kind":"input","index":0},
            "right":{"kind":"literal","value":1}});
        assert!(emit(&input).is_none());
        input["host"]["props"][0][1] = serde_json::json!({"kind":"conditional",
            "test":{"kind":"input","index":0},
            "consequent":{"kind":"literal","value":1},
            "alternate":{"kind":"literal","value":2}});
        assert!(emit(&input).is_none());
        input["host"]["props"][0][1] = serde_json::json!({"kind":"input","index":1});
        assert!(emit(&input).is_none());
    }

    #[test]
    fn retained_leaf_uses_flattened_paths_and_preserves_negative_zero_expression() {
        let input = serde_json::json!({
            "schemaVersion": 6, "componentProgramId": "component", "moduleRevision": "rev",
            "inputs": [
                {"paths": [[], ["x"]]},
                {"paths": [["y"]]}
            ],
            "host": {"child": null, "props": [["position-x", {
                "kind": "binary", "operator": "*",
                "left": {"kind": "unary", "operator": "-", "argument": {
                    "kind": "literal", "value": 0
                }},
                "right": {"kind": "input", "index": 2}
            }]]}
        });
        let execution = emit(&input).unwrap();
        assert_eq!(execution.descriptor["kind"], "owned-data");
        assert!(!execution.code.contains("executeRange"));
        assert!(execution.code.contains("outputs[0] = ((-0) * inputs[2]);"));
    }

    #[test]
    fn selects_only_empty_child_primitive_group() {
        let mut input = serde_json::json!({
            "schemaVersion": 5, "componentProgramId": "marker", "moduleRevision": "rev",
            "inputs": [{"paths": [["epoch"]]}],
            "host": {"tag": "group", "children": [], "props": [
                ["name", {"kind": "literal", "value": "renamed-group"}],
                ["visible", {"kind": "literal", "value": true}],
                ["position-x", {"kind": "input", "index": 0}]
            ]}
        });
        let marker = emit(&input).unwrap();
        assert_eq!(marker.descriptor["schemaVersion"], 2);
        assert!(marker.code.contains("outputs[0] = inputs[0];"));
        assert!(!marker.code.contains("renamed-group"));
        assert!(!marker.code.contains("outputs[1]"));
        input["host"]["children"] = serde_json::json!([{"kind":"text","expression":{
            "kind":"input","index":0}}]);
        assert!(emit(&input).is_none());
        input["host"]["children"] = serde_json::json!([]);
        input["host"]["props"][2][1] = serde_json::json!({"kind":"logical",
            "operator":"&&","left":{"kind":"input","index":0},
            "right":{"kind":"literal","value":1}});
        assert!(emit(&input).is_none());
        input["host"]["props"][2][1] = serde_json::json!({"kind":"literal","value":4});
        let literal_marker = emit(&input).unwrap();
        assert!(literal_marker.code.contains("outputs[0] = 4;"));
        assert!(!literal_marker.code.contains("outputs[1]"));
    }

    #[test]
    fn emits_every_existing_numeric_operator_without_reassociation() {
        let binary = ["+", "-", "*", "/", "%", "**", "<<", ">>", ">>>", "|", "^", "&"];
        let unary = ["+", "-", "~"];
        let mut props = Vec::new();
        for (index, operator) in binary.iter().enumerate() {
            props.push(serde_json::json!([format!("binary-{index}"), {
                "kind": "binary", "operator": operator,
                "left": {"kind": "input", "index": 1},
                "right": {"kind": "input", "index": 0}
            }]));
        }
        for (index, operator) in unary.iter().enumerate() {
            props.push(serde_json::json!([format!("unary-{index}"), {
                "kind": "unary", "operator": operator,
                "argument": {"kind": "input", "index": 1}
            }]));
        }
        let program = serde_json::json!({
            "schemaVersion": 2, "componentProgramId": "operators", "moduleRevision": "revision",
            "inputs": [{}, {}], "host": {"child": null, "props": props}
        });
        let execution = emit(&program).unwrap();
        for (index, operator) in binary.iter().enumerate() {
            assert!(execution.code.contains(&format!(
                "outputs[{index}] = (inputs[1] {operator} inputs[0]);")), "{}", execution.code);
        }
        for (index, operator) in unary.iter().enumerate() {
            assert!(execution.code.contains(&format!(
                "outputs[{}] = ({operator}inputs[1]);", index + binary.len())), "{}", execution.code);
        }
    }

    #[test]
    fn keeps_grouping_signed_zero_overflow_and_nonshared_expressions() {
        let program = serde_json::json!({
            "schemaVersion": 2, "componentProgramId": "numeric", "moduleRevision": "rev-b",
            "inputs": [{}, {}, {}], "host": {"child": null, "props": [
                ["left", {"kind":"binary","operator":"-", "left":{"kind":"input","index":0},
                    "right":{"kind":"binary","operator":"-","left":{"kind":"input","index":1},"right":{"kind":"input","index":2}}}],
                ["right", {"kind":"binary","operator":"-", "left":{"kind":"binary","operator":"-","left":{"kind":"input","index":0},"right":{"kind":"input","index":1}},
                    "right":{"kind":"input","index":2}}],
                ["negative-zero", {"kind":"unary","operator":"-","argument":{"kind":"literal","value":0}}],
                ["positive-zero", {"kind":"unary","operator":"+","argument":{"kind":"literal","value":0}}],
                ["coerce-overflow", {"kind":"binary","operator":"|","left":{"kind":"binary","operator":"*","left":{"kind":"input","index":0},"right":{"kind":"literal","value":1e308}},"right":{"kind":"literal","value":0}}]
            ]}
        });
        let execution = emit(&program).unwrap();
        assert_eq!(execution.descriptor["moduleRevision"], "rev-b");
        assert!(execution.code.contains("outputs[0] = (inputs[0] - (inputs[1] - inputs[2]));"));
        assert!(execution.code.contains("outputs[1] = ((inputs[0] - inputs[1]) - inputs[2]);"));
        assert!(execution.code.contains("outputs[2] = (-0);"));
        assert!(execution.code.contains("outputs[3] = (+0);"));
        assert!(execution.code.contains("outputs[4] = ((inputs[0] * "), "{}", execution.code);
        assert!(execution.code.contains(") | 0);"), "{}", execution.code);
        assert!(!execution.code.contains("const $r3actDag"));
    }
}
