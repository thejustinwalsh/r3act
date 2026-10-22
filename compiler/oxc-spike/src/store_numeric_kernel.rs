use serde_json::Value;

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
    let mut numeric_props = 0;
    for prop in props {
        let pair = prop.as_array()?;
        if pair.len() != 2 { return None; }
        pair[0].as_str()?;
        if empty_primitive_group && pair[1].get("kind")?.as_str()? == "literal" {
            let value = pair[1].get("value")?;
            if !value.is_null() && !value.is_boolean() && !value.is_string() &&
                !value.as_f64().is_some_and(|number| number.is_finite()) { return None; }
            if value.is_number() { numeric_props += 1; }
        } else {
            numeric_expression(&pair[1], input_count, 0)?;
            numeric_props += 1;
        }
    }
    if numeric_props == 0 { return None; }
    let descriptor = serde_json::json!({
        "schemaVersion": 1,
        "kind": "owned-data",
        "componentProgramId": component_id,
        "moduleRevision": revision,
    });
    Some(StoreDataExecution { code: descriptor.to_string(), descriptor })
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
        assert_eq!(execution.descriptor["componentProgramId"], "component");
        assert!(!execution.code.contains("executeRange"));
        assert!(!execution.code.contains("inputValues"));
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
        assert!(emit(&input).is_some());
        input["host"]["children"] = serde_json::json!([{"kind":"text","expression":{
            "kind":"input","index":0}}]);
        assert!(emit(&input).is_none());
        input["host"]["children"] = serde_json::json!([]);
        input["host"]["props"][2][1] = serde_json::json!({"kind":"logical",
            "operator":"&&","left":{"kind":"input","index":0},
            "right":{"kind":"literal","value":1}});
        assert!(emit(&input).is_none());
    }
}
