use serde_json::Value;

use crate::numeric_expression_dag;

pub(super) struct StoreNumericKernel {
    pub(super) code: String,
    pub(super) descriptor: Value,
}

pub(super) fn numeric_expression(node: &Value, input_count: usize, depth: usize) -> Option<String> {
    if depth > 32 { return None; }
    match node.get("kind")?.as_str()? {
        "input" => {
            let index = usize::try_from(node.get("index")?.as_u64()?).ok()?;
            (index < input_count).then(||
                format!("inputValues[$r3actInputBase + {index}]")
            )
        }
        "literal" => {
            let value = node.get("value")?;
            value.as_f64().filter(|number| number.is_finite())?;
            Some(value.to_string())
        }
        "unary" => {
            let operator = node.get("operator")?.as_str()?;
            if !matches!(operator, "+" | "-" | "~") { return None; }
            let argument = numeric_expression(node.get("argument")?, input_count, depth + 1)?;
            Some(format!("({operator}({argument}))"))
        }
        "binary" => {
            let operator = node.get("operator")?.as_str()?;
            if !matches!(operator, "+" | "-" | "*" | "/" | "%" | "**" |
                "<<" | ">>" | ">>>" | "|" | "^" | "&") { return None; }
            let left = numeric_expression(node.get("left")?, input_count, depth + 1)?;
            let right = numeric_expression(node.get("right")?, input_count, depth + 1)?;
            Some(format!("(({left}) {operator} ({right}))"))
        }
        _ => None,
    }
}

pub(super) fn emit(program: &Value) -> Option<StoreNumericKernel> {
    let schema = program.get("schemaVersion")?.as_u64()?;
    if !matches!(schema, 1 | 2 | 3 | 6 | 7) { return None; }
    let component_id = program.get("componentProgramId")?.as_str()?;
    let revision = program.get("moduleRevision")?.as_str()?;
    let host = program.get("host")?;
    if !host.get("child")?.is_null() { return None; }
    let input_count = if schema == 1 { 1 } else if schema == 6 || schema == 7 {
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
    let mut names = Vec::with_capacity(props.len());
    let mut expressions = Vec::with_capacity(props.len());
    for prop in props {
        let pair = prop.as_array()?;
        if pair.len() != 2 { return None; }
        names.push(pair[0].as_str()?.to_owned());
        expressions.push(numeric_expression(&pair[1], input_count, 0)?);
    }
    let (declarations, lowered) = numeric_expression_dag::lower_all(&expressions, input_count)?;
    let writes = lowered.iter().enumerate().map(|(index, expression)|
        format!("outputValues[$r3actOutputBase + {index}] = {expression};")
    ).collect::<String>();
    let output_count = names.len();
    let code = format!(
        "{{ schemaVersion: 1, componentProgramId: {}, moduleRevision: {}, inputCount: {input_count}, propNames: {}, executeRange(inputValues: readonly number[], inputStart: number, rowCount: number, outputValues: number[], outputStart: number): number {{ for (let $r3actRow = 0; $r3actRow < rowCount; $r3actRow++) {{ const $r3actInputBase = inputStart + $r3actRow * {input_count}; const $r3actOutputBase = outputStart + $r3actRow * {output_count}; {declarations}{writes} }} return rowCount * {output_count}; }} }}",
        serde_json::to_string(component_id).ok()?,
        serde_json::to_string(revision).ok()?,
        serde_json::to_string(&names).ok()?,
    );
    let descriptor = serde_json::json!({
        "schemaVersion": 1,
        "componentProgramId": component_id,
        "moduleRevision": revision,
        "inputCount": input_count,
        "propNames": names,
    });
    Some(StoreNumericKernel { code, descriptor })
}

#[cfg(test)]
mod tests {
    use super::emit;

    #[test]
    fn emits_flat_ranges_with_shared_numeric_tree() {
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
        let kernel = emit(&input).unwrap();
        assert_eq!(kernel.descriptor["inputCount"], 2);
        assert_eq!(kernel.descriptor["propNames"], serde_json::json!(["position-x", "position-y"]));
        assert!(kernel.code.contains("inputStart + $r3actRow * 2"));
        assert!(kernel.code.contains("outputStart + $r3actRow * 2"));
        assert!(kernel.code.contains("const $r3actDag0"));
        assert!(!kernel.code.contains("seenMask"));
        assert!(kernel.code.contains("return rowCount * 2"));
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
    fn retained_leaf_uses_flattened_paths_and_preserves_negative_zero() {
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
        let kernel = emit(&input).unwrap();
        assert_eq!(kernel.descriptor["inputCount"], 3);
        assert!(kernel.code.contains("inputValues[$r3actInputBase + 2]"));
        assert!(kernel.code.contains("-(0)"));
    }
}
