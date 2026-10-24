use super::*;

fn direct_prop<'a>(expression: &Expression<'a>, props: SymbolId,
    semantic: &Semantic<'a>) -> Option<String> {
    let Expression::StaticMemberExpression(member) = expression else { return None; };
    let Expression::Identifier(object) = &member.object else { return None; };
    if member.optional || reference_symbol(object, semantic) != Some(props) { return None; }
    let name = member.property.name.as_str();
    if !name.bytes().next().is_some_and(|byte| byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$') ||
        !name.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'$') {
        return None;
    }
    Some(name.to_owned())
}

pub(super) fn closed_program<'a>(
    callable: &ClosedCallable<'a, '_>, component: &ComponentStateSiteIr,
    semantic: &Semantic<'a>, revision: &str,
) -> Option<serde_json::Value> {
    let store_count = component.store_sites.len();
    let state_count = component.state_sites.len();
    let frame_without_props = frame_only_zero_parameter(callable, component) &&
        component.effect_sites.is_empty();
    if !(1..=8).contains(&store_count) || state_count > 8 ||
        !component.collection_sites.is_empty() ||
        (!frame_without_props && callable.params.items.len() != 1) ||
        callable.params.rest.is_some() || callable.statements.len() < store_count + state_count + 1 ||
        (!frame_without_props && component.frame_sites.iter().any(|site| site.callback)) ||
        component.store_sites.iter().any(|site| !matches!(site.hook_name.as_str(), "use" | "useFrame")) {
        return None;
    }
    let props_symbol = if frame_without_props { None } else {
        let parameter = &callable.params.items[0];
        let BindingPattern::BindingIdentifier(props) = &parameter.pattern else { return None; };
        if parameter.optional || parameter.initializer.is_some() { return None; }
        Some(props.symbol_id.get()?)
    };
    let mut inputs = Vec::with_capacity(store_count);
    let mut state_sites = Vec::with_capacity(state_count);
    let mut effect_sites = Vec::with_capacity(component.effect_sites.len());
    let mut setters = BTreeSet::new();
    let mut frame_callbacks = BTreeSet::new();
    let mut state_index = 0;
    let mut store_index = 0;
    let mut effect_index = 0;
    let mut proof = StoreProjectionProof {
        semantic, bindings: BTreeMap::new(), binding_paths: BTreeMap::new(), derived: BTreeMap::new(),
        paths: vec![Vec::new(); store_count + state_count],
        slots: Vec::new(), prop_symbol: props_symbol,
        prop_inputs: Vec::new(), member_seen: false,
    };
    for path in proof.paths.iter_mut().skip(store_count) { path.push(Vec::new()); }
    for statement in callable.statements.iter().take(callable.statements.len() - 1) {
        if let Some(Declaration::VariableDeclaration(declaration)) = statement.as_declaration() {
            if declaration.kind != oxc_ast::ast::VariableDeclarationKind::Const ||
                declaration.declarations.len() != 1 { return None; }
            let declarator = &declaration.declarations[0];
            let initializer = declarator.init.as_ref()?;
            if let Expression::CallExpression(call) = initializer {
                if component.store_sites.get(store_index).is_some_and(|site|
                    site.call.start == call.span.start && site.call.end == call.span.end) {
                    let site = &component.store_sites[store_index];
                    if call.optional || call.arguments.len() !=
                        (if site.hook_name == "use" { 1 } else { 0 }) {
                        return None;
                    }
                    let prop = if site.hook_name == "useFrame" { "$frameClock".to_owned() }
                        else { direct_prop(call.arguments[0].as_expression()?, props_symbol?, semantic)? };
                    let bound = if site.hook_name == "useFrame" {
                        frame_clock_binding_paths(&declarator.id)?
                    } else {
                        let BindingPattern::BindingIdentifier(value) = &declarator.id else { return None; };
                        vec![(value.symbol_id.get()?, Vec::new())]
                    };
                    for (symbol, path) in bound {
                        if proof.bindings.insert(symbol, store_index).is_some() { return None; }
                        if !path.is_empty() { proof.binding_paths.insert(symbol, path); }
                    }
                    let mut input = serde_json::json!({
                        "storeUseSiteId": site.site_id, "storeProp": prop,
                    });
                    if site.hook_name == "useFrame" {
                        input["sourceKind"] = serde_json::json!("frameClock");
                    }
                    inputs.push(input);
                    store_index += 1;
                    continue;
                }
                if component.state_sites.get(state_index).is_some_and(|site|
                    site.call.start == call.span.start && site.call.end == call.span.end) {
                    if call.optional || call.arguments.len() != 1 { return None; }
                    let BindingPattern::ArrayPattern(pattern) = &declarator.id else { return None; };
                    if pattern.rest.is_some() || !(1..=2).contains(&pattern.elements.len()) { return None; }
                    let Some(Some(BindingPattern::BindingIdentifier(value))) = pattern.elements.first()
                        else { return None; };
                    let value_symbol = value.symbol_id.get()?;
                    let mut constant = StoreProjectionProof {
                        semantic, bindings: BTreeMap::new(), binding_paths: BTreeMap::new(),
                        derived: BTreeMap::new(),
                        paths: Vec::new(), slots: Vec::new(), prop_symbol: None,
                        prop_inputs: Vec::new(), member_seen: false,
                    };
                    let initial = constant.expression(call.arguments[0].as_expression()?)?;
                    store_numeric_kernel::numeric_expression(&initial, 0, 0)?;
                    if proof.bindings.insert(value_symbol, store_count + state_index).is_some() { return None; }
                    if let Some(second) = pattern.elements.get(1) {
                        let Some(BindingPattern::BindingIdentifier(setter)) = second else { return None; };
                        setters.insert(setter.symbol_id.get()?);
                    }
                    state_sites.push(component.state_sites[state_index].site_id.clone());
                    state_index += 1;
                    continue;
                }
            }
            let BindingPattern::BindingIdentifier(local) = &declarator.id else { return None; };
            let symbol = local.symbol_id.get()?;
            if proof.bindings.contains_key(&symbol) || proof.derived.contains_key(&symbol) { return None; }
            let expression = proof.expression(initializer)?;
            store_numeric_kernel::numeric_expression(&expression, 32, 0)?;
            proof.derived.insert(symbol, expression);
        } else if let Statement::ExpressionStatement(statement) = statement {
            let Expression::CallExpression(call) = &statement.expression else { return None; };
            if let Some((index, site)) = component.frame_sites.iter().enumerate().find(|(_, site)|
                site.callback && site.call.start == call.span.start && site.call.end == call.span.end) {
                let mut required_props = BTreeSet::new();
                if !frame_callbacks.insert(index) || !closed_numeric_frame_callback(call,
                    semantic, &setters, props_symbol, &BTreeSet::new(), &mut required_props) ||
                    !required_props.is_empty() { return None; }
                effect_sites.push(site.site_id.clone());
                continue;
            }
            let site = component.effect_sites.get(effect_index)?;
            if call.optional || site.call.start != call.span.start || site.call.end != call.span.end ||
                call.arguments.len() != 1 { return None; }
            let setup = call.arguments[0].as_expression()?;
            if !matches!(setup, Expression::ArrowFunctionExpression(_) |
                Expression::FunctionExpression(_)) { return None; }
            let mut usage = RetainedChildEffectUse {
                semantic, props_symbol: props_symbol?, references: BTreeSet::new(),
                direct_fields: BTreeSet::new(), field_names: BTreeSet::new(),
                reads_children: false,
            };
            usage.visit_expression(setup);
            if usage.reads_children || !usage.references.is_subset(&usage.direct_fields) ||
                usage.field_names.contains("key") || usage.field_names.contains("ref") { return None; }
            effect_sites.push(site.site_id.clone());
            effect_index += 1;
        } else { return None; }
    }
    if store_index != store_count || state_index != state_count ||
        effect_index != component.effect_sites.len() ||
        frame_callbacks.len() != component.frame_sites.iter().filter(|site| site.callback).count() {
        return None;
    }
    let mut returned = callable.return_expression(callable.statements.len() - 1)?;
    while let Expression::ParenthesizedExpression(inner) = returned { returned = &inner.expression; }
    let Expression::JSXElement(element) = returned else { return None; };
    let JSXElementName::Identifier(tag) = &element.opening_element.name else { return None; };
    let tag = tag.name.as_str();
    if !matches!(tag, "mesh" | "group" | "div" | "span" | "output") ||
        element.opening_element.attributes.len() > 33 { return None; }
    let mut forwarded = element.children.iter().filter(|child| !closed_jsx_child_elided(child));
    let retained = if let Some(child) = forwarded.next() {
        if forwarded.next().is_some() { return None; }
        let JSXChild::ExpressionContainer(container) = child else { return None; };
        let expression = container.expression.as_expression()?;
        props_symbol.and_then(|props| direct_prop(expression, props, semantic))
            .is_some_and(|name| name == "children")
    } else { false };
    if !retained && !closed_jsx_children_empty(&element.children) { return None; }
    if retained && inputs.iter().any(|input| input["storeProp"] == "children") { return None; }
    let mut key = None;
    let mut props = Vec::new();
    let mut seen = BTreeSet::new();
    for attribute in &element.opening_element.attributes {
        let JSXAttributeItem::Attribute(attribute) = attribute else { return None; };
        let JSXAttributeName::Identifier(name) = &attribute.name else { return None; };
        let name = name.name.as_str();
        if name == "key" {
            if key.is_some() { return None; }
            let Some(JSXAttributeValue::StringLiteral(value)) = attribute.value.as_ref() else { return None; };
            if value.value.is_empty() || value.value.chars().any(|ch| matches!(ch, '&' | '\n' | '\r' | '\t')) { return None; }
            key = Some(value.value.to_string());
        } else {
            let static_three_name = matches!(tag, "mesh" | "group") && name == "name";
            if (!static_three_name && !closed_store_host_property_name(tag, name)) ||
                !seen.insert(name.to_owned()) { return None; }
            let expression = if static_three_name {
                let Some(JSXAttributeValue::StringLiteral(value)) = attribute.value.as_ref() else { return None; };
                serde_json::json!({"kind":"literal","value":value.value.as_str()})
            } else {
                let JSXAttributeValue::ExpressionContainer(container) = attribute.value.as_ref()? else { return None; };
                let expression = proof.expression(container.expression.as_expression()?)?;
                store_numeric_kernel::numeric_expression(&expression, 32, 0)?;
                expression
            };
            props.push(serde_json::json!([name, expression]));
        }
    }
    if props.is_empty() { return None; }
    let mut host = serde_json::json!({
        "tag": tag, "key": key?, "props": props, "child": null,
    });
    let prop_inputs = proof.finish_mixed(&mut host, &mut inputs)?;
    if state_count == 0 && prop_inputs.is_empty() { return None; }
    if !proven_frame_clock_paths(&inputs) { return None; }
    let schema = if prop_inputs.is_empty() { 7 } else { 8 };
    let mut program = serde_json::json!({
        "schemaVersion": schema,
        "componentProgramId": component.component_site_id,
        "moduleRevision": revision,
        "inputs": inputs,
        "stateSites": state_sites,
        "effectSites": effect_sites,
        "retainedChildProp": if retained { Some("children") } else { None },
        "host": host,
    });
    if schema == 8 { program["propInputs"] = serde_json::json!(prop_inputs); }
    store_numeric_kernel::emit(&program)?;
    Some(program)
}
