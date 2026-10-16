use std::{
    collections::{BTreeMap, BTreeSet},
    env, fs, process,
};

use oxc_allocator::Allocator;
use oxc_ast::{
    ast::{
        Argument, ArrayExpressionElement, BindingPattern, CallExpression, Expression, Function,
        FormalParameters, ImportDeclaration, ImportDeclarationSpecifier, JSXAttributeItem,
        JSXAttributeName, JSXAttributeValue, JSXElement, JSXElementName, ModuleExportName,
        VariableDeclarator,
    },
    AstKind,
};
use oxc_ast_visit::{walk, Visit};
use oxc_parser::Parser;
use oxc_semantic::{ScopeFlags, Semantic, SemanticBuilder, SymbolId};
use oxc_span::{GetSpan, SourceType};
use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
struct SourceSpan {
    start: u32,
    end: u32,
}

#[derive(Debug, Serialize)]
struct AttributeIr {
    name: String,
    span: SourceSpan,
    source: String,
    dynamic: bool,
    static_value: Option<String>,
}

#[derive(Debug, Serialize)]
struct BindingIr {
    attribute: String,
    source_expression: String,
    projection_expression: Option<String>,
    host_property: Option<String>,
    projection_parameter: Option<String>,
    projection_body_expression: Option<String>,
    callee_resolves_to_import: bool,
    source_root_resolves_to_parameter: bool,
    span: SourceSpan,
}

#[derive(Debug, Serialize)]
struct HostNodeIr {
    id: usize,
    tag: String,
    span: SourceSpan,
    attributes: Vec<AttributeIr>,
    bindings: Vec<BindingIr>,
}

#[derive(Debug, Serialize)]
struct ProgramIr {
    schema_version: u32,
    frontend: &'static str,
    source_file: String,
    host_nodes: Vec<HostNodeIr>,
    unsupported_bind_calls: Vec<SourceSpan>,
    repeated_host_plan: Option<RepeatedHostPlan>,
}

#[derive(Debug, Serialize)]
struct RepeatedHostPlan {
    collection_expression: String,
    item_parameter: String,
    index_parameter: String,
    root_tag: String,
    root_static_attributes: Vec<(String, String)>,
    item_tag: String,
    item_static_attributes: Vec<(String, String)>,
    binding_source_parameter: String,
    bindings: Vec<RepeatedBindingPlan>,
    dependency_graph: DependencyGraphIr,
}

#[derive(Debug, Serialize)]
struct DependencyGraphIr {
    source_count: usize,
    source_paths: Vec<String>,
    source_binding_offsets: Vec<usize>,
    binding_ids: Vec<usize>,
    shared_source_count: usize,
    shared_source_paths: Vec<String>,
    shared_source_binding_offsets: Vec<usize>,
    shared_binding_ids: Vec<usize>,
}

#[derive(Debug, Serialize)]
struct DerivedRegionGraphIr {
    source_count: usize,
    source_paths: Vec<String>,
    source_region_offsets: Vec<usize>,
    region_ids: Vec<usize>,
}

#[derive(Debug, Serialize)]
struct DerivedKeyedRegionPlan {
    schema_version: u32,
    source_file: String,
    collection_source: String,
    predicate_sources: Vec<String>,
    collection_binding: String,
    item_parameter: String,
    item_key_path: String,
    root_tag: String,
    item_tag: String,
    region_id: usize,
    dependency_graph: DerivedRegionGraphIr,
}

#[derive(Debug, Serialize)]
struct DerivedKeyedRegionIr {
    region_id: usize,
    collection_source: String,
    predicate_sources: Vec<String>,
    collection_binding: String,
    item_parameter: String,
    item_key_path: String,
    root_tag: String,
    item_tag: String,
}

#[derive(Debug, Serialize)]
struct DerivedKeyedRegionsPlan {
    schema_version: u32,
    source_file: String,
    regions: Vec<DerivedKeyedRegionIr>,
    dependency_graph: DerivedRegionGraphIr,
}

#[derive(Debug, Serialize)]
struct ComponentStateSitesPlan {
    schema_version: u32,
    source_file: String,
    hook_import: Option<SourceSpan>,
    components: Vec<ComponentStateSiteIr>,
    invalidation_graph: ComponentStateInvalidationGraphIr,
}

#[derive(Debug, Serialize)]
struct AsyncTaskPlanIr {
    schema_version: u32,
    source_file: String,
    tasks: Vec<AsyncTaskNodeIr>,
    task_order: Vec<usize>,
}

#[derive(Debug, Serialize)]
struct AsyncTaskNodeIr {
    id: String,
    site_id: String,
    depends_on: Vec<String>,
    #[serde(skip)]
    inferred_reads: Vec<String>,
    call: SourceSpan,
}

struct AsyncTaskPlanCollector<'s, 'a> {
    source_file: &'s str,
    semantic: &'s Semantic<'a>,
    imported_async_task: bool,
    invalid_import: bool,
    tasks: Vec<AsyncTaskNodeIr>,
    invalid_call: Option<String>,
}

struct AsyncTaskInputReadCollector<'s, 'a> {
    semantic: &'s Semantic<'a>,
    input_symbol: Option<SymbolId>,
    read_keys: Vec<String>,
    invalid_dynamic_read: bool,
}

fn async_task_input_symbol(parameters: &FormalParameters<'_>) -> Option<SymbolId> {
    let parameter = parameters.items.first()?;
    let BindingPattern::BindingIdentifier(identifier) = &parameter.pattern else {
        return None;
    };
    identifier.symbol_id.get()
}

impl<'a> Visit<'a> for AsyncTaskInputReadCollector<'_, 'a> {
    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let Expression::StaticMemberExpression(member) = &node.callee {
            if member.property.name == "get"
                && let Expression::Identifier(identifier) = &member.object
            {
                let input_symbol = identifier.reference_id.get().and_then(|reference_id| {
                    self.semantic
                        .scoping()
                        .get_reference(reference_id)
                        .symbol_id()
                });
                if input_symbol == self.input_symbol {
                    match node.arguments.first() {
                        Some(Argument::StringLiteral(literal)) => {
                            let key = literal.value.as_str().to_owned();
                            if !self.read_keys.contains(&key) {
                                self.read_keys.push(key);
                            }
                        }
                        Some(_) => self.invalid_dynamic_read = true,
                        None => self.invalid_dynamic_read = true,
                    }
                }
            }
        }
        walk::walk_call_expression(self, node);
    }
}

impl AsyncTaskPlanCollector<'_, '_> {
    fn into_plan(mut self) -> Result<AsyncTaskPlanIr, String> {
        if !self.imported_async_task {
            return Err("async task plan requires a named asyncTask import".to_owned());
        }
        if self.invalid_import {
            return Err("asyncTask must be imported as a named, unaliased helper".to_owned());
        }
        if let Some(error) = self.invalid_call {
            return Err(error);
        }
        if self.tasks.is_empty() {
            return Err("async task plan found no asyncTask declarations".to_owned());
        }

        let mut index_by_id = BTreeMap::new();
        for (index, task) in self.tasks.iter().enumerate() {
            if task.id.trim().is_empty() || task.id.contains(':') {
                return Err(format!("async task ID must be non-empty and cannot contain `:`: {}", task.id));
            }
            if index_by_id.insert(task.id.clone(), index).is_some() {
                return Err(format!("duplicate async task ID: {}", task.id));
            }
        }
        for task in &mut self.tasks {
            for read in std::mem::take(&mut task.inferred_reads) {
                let dependency = if index_by_id.contains_key(&read) {
                    read
                } else {
                    format!("${read}")
                };
                if !task.depends_on.contains(&dependency) {
                    task.depends_on.push(dependency);
                }
            }
        }
        let mut indegree = vec![0usize; self.tasks.len()];
        let mut dependents = vec![Vec::new(); self.tasks.len()];
        for (task_index, task) in self.tasks.iter().enumerate() {
            let mut seen = BTreeSet::new();
            for dependency in &task.depends_on {
                if !seen.insert(dependency) {
                    return Err(format!("duplicate dependency `{dependency}` in async task `{}`", task.id));
                }
                if let Some(input_id) = dependency.strip_prefix('$') {
                    if input_id.trim().is_empty() {
                        return Err(format!(
                            "async task {} has an empty state input ID",
                            task.id
                        ));
                    }
                    continue;
                }
                let dependency_index = index_by_id.get(dependency).copied().ok_or_else(|| {
                    format!("async task `{}` depends on unknown task `{dependency}`", task.id)
                })?;
                indegree[task_index] += 1;
                dependents[dependency_index].push(task_index);
            }
        }
        let mut ready = Vec::new();
        for (index, degree) in indegree.iter().enumerate() {
            if *degree == 0 { ready.push(index); }
        }
        let mut task_order = Vec::with_capacity(self.tasks.len());
        let mut cursor = 0;
        while cursor < ready.len() {
            let task = ready[cursor];
            cursor += 1;
            task_order.push(task);
            for dependent in &dependents[task] {
                indegree[*dependent] -= 1;
                if indegree[*dependent] == 0 { ready.push(*dependent); }
            }
        }
        if task_order.len() != self.tasks.len() {
            return Err("async task plan contains a dependency cycle".to_owned());
        }
        Ok(AsyncTaskPlanIr {
            schema_version: 1,
            source_file: self.source_file.to_owned(),
            tasks: self.tasks,
            task_order,
        })
    }
}

#[derive(Debug, Serialize)]
struct ComponentStateInvalidationGraphIr {
    source_count: usize,
    source_paths: Vec<String>,
    source_region_offsets: Vec<usize>,
    region_ids: Vec<usize>,
    region_component_site_ids: Vec<String>,
}

#[derive(Debug, Serialize)]
struct ComponentStateSiteIr {
    name: String,
    component_site_id: String,
    declaration: SourceSpan,
    state_sites: Vec<StateSiteIr>,
    effect_sites: Vec<EffectSiteIr>,
}

#[derive(Debug, Serialize)]
struct StateSiteIr {
    ordinal: usize,
    site_id: String,
    call: SourceSpan,
}

#[derive(Debug, Serialize)]
struct EffectSiteIr {
    ordinal: usize,
    site_id: String,
    argument_count: usize,
    call: SourceSpan,
}

#[derive(Debug, Serialize)]
struct RepeatedBindingPlan {
    property: String,
    source_scope: String,
    source_path: String,
    source_slot: usize,
    projection_parameter: String,
    projection_body_expression: String,
}

#[derive(Clone)]
struct CallIr {
    span: SourceSpan,
    args: Vec<String>,
    callee_resolves_to_import: bool,
    source_root_resolves_to_parameter: bool,
    projection_parameter: Option<String>,
    projection_body_expression: Option<String>,
}

#[derive(Clone)]
struct MapIr {
    collection_expression: String,
    item_parameter: String,
    index_parameter: String,
    element_span: SourceSpan,
}

#[derive(Clone)]
struct FilterIr {
    output_binding: String,
    collection_source: String,
    predicate_sources: Vec<String>,
}

struct Collector<'s, 'a> {
    source: &'s str,
    semantic: &'s Semantic<'a>,
    nodes: Vec<HostNodeIr>,
    calls: Vec<CallIr>,
    maps: Vec<MapIr>,
    filters: Vec<FilterIr>,
    unsupported_binding_attributes: Vec<SourceSpan>,
}

struct ComponentStateSiteCollector<'s, 'a> {
    source_file: &'s str,
    semantic: &'s Semantic<'a>,
    component_stack: Vec<String>,
    components: BTreeMap<String, ComponentStateSiteIr>,
    hook_import: Option<SourceSpan>,
    imported_hooks: BTreeSet<String>,
    unsupported_import_shape: bool,
    unscoped_hook_calls: Vec<SourceSpan>,
    unsupported_effect_arity: bool,
}

impl ComponentStateSiteCollector<'_, '_> {
    fn into_plan(self) -> ComponentStateSitesPlan {
        let components: Vec<_> = self.components.into_values().collect();
        let mut source_paths = Vec::new();
        let mut source_region_offsets = vec![0];
        let mut region_ids = Vec::new();
        let region_component_site_ids = components
            .iter()
            .map(|component| component.component_site_id.clone())
            .collect();
        for (region_id, component) in components.iter().enumerate() {
            for state_site in &component.state_sites {
                source_paths.push(state_site.site_id.clone());
                region_ids.push(region_id);
                source_region_offsets.push(region_ids.len());
            }
        }
        ComponentStateSitesPlan {
            schema_version: 3,
            source_file: self.source_file.to_owned(),
            hook_import: self.hook_import,
            components,
            invalidation_graph: ComponentStateInvalidationGraphIr {
                source_count: source_paths.len(),
                source_paths,
                source_region_offsets,
                region_ids,
                region_component_site_ids,
            },
        }
    }
}

impl<'a> Visit<'a> for ComponentStateSiteCollector<'_, 'a> {
    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &node.specifiers {
            let relevant = specifiers.iter().any(|specifier| match specifier {
                ImportDeclarationSpecifier::ImportSpecifier(specifier) => {
                    let local = specifier.local.name.as_str();
                    let imported = matches!(
                        &specifier.imported,
                        ModuleExportName::IdentifierName(name) if name.name == "useState" || name.name == "useEffect"
                    );
                    imported || local == "useState" || local == "useEffect"
                }
                _ => false,
            });
            if relevant {
                let mut hooks = BTreeSet::new();
                let mut valid = true;
                for specifier in specifiers {
                    let ImportDeclarationSpecifier::ImportSpecifier(specifier) = specifier else {
                        valid = false;
                        continue;
                    };
                    let imported_name = match &specifier.imported {
                        ModuleExportName::IdentifierName(name) => name.name.as_str(),
                        _ => "",
                    };
                    if (imported_name != "useState" && imported_name != "useEffect") ||
                        specifier.local.name.as_str() != imported_name || !hooks.insert(imported_name.to_owned())
                    {
                        valid = false;
                    }
                }
                if !valid || hooks.is_empty() || self.hook_import.is_some() {
                    self.unsupported_import_shape = true;
                } else {
                    self.hook_import = Some(span(node.span.start, node.span.end));
                    self.imported_hooks.extend(hooks);
                }
            }
        }
        walk::walk_import_declaration(self, node);
    }

    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        let component_name = node.id.as_ref().map(|identifier| identifier.name.as_str().to_owned())
            .filter(|name| name.chars().next().is_some_and(char::is_uppercase));
        if let Some(name) = &component_name {
            let component_site_id = format!("{}#component:{}", self.source_file, name);
            self.components.entry(name.clone()).or_insert_with(|| ComponentStateSiteIr {
                name: name.clone(),
                component_site_id,
                declaration: span(node.span.start, node.span.end),
                state_sites: Vec::new(),
                effect_sites: Vec::new(),
            });
            self.component_stack.push(name.clone());
        }
        walk::walk_function(self, node, flags);
        if component_name.is_some() {
            self.component_stack.pop();
        }
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let Expression::Identifier(identifier) = &node.callee {
            let imported_hook = self.imported_hooks.contains(identifier.name.as_str())
                && identifier.reference_id.get()
                    .and_then(|reference_id| self.semantic.scoping().get_reference(reference_id).symbol_id())
                    .is_some_and(|symbol_id| matches!(
                        self.semantic.symbol_declaration(symbol_id).kind(),
                        AstKind::ImportSpecifier(_)
                    ));
            if imported_hook {
                if let Some(component_name) = self.component_stack.last() {
                  if let Some(component) = self.components.get_mut(component_name) {
                    if identifier.name == "useState" {
                        let ordinal = component.state_sites.len();
                        component.state_sites.push(StateSiteIr {
                            ordinal,
                            site_id: format!("{}#component:{}#state:{}", self.source_file, component_name, ordinal),
                            call: span(node.span.start, node.span.end),
                        });
                    } else {
                        let ordinal = component.effect_sites.len();
                        component.effect_sites.push(EffectSiteIr {
                            ordinal,
                            site_id: format!("{}#component:{}#effect:{}", self.source_file, component_name, ordinal),
                            argument_count: node.arguments.len(),
                            call: span(node.span.start, node.span.end),
                        });
                        if node.arguments.len() != 1 {
                            self.unsupported_effect_arity = true;
                        }
                    }
                  }
                } else {
                    self.unscoped_hook_calls.push(span(node.span.start, node.span.end));
                }
            }
        }
        walk::walk_call_expression(self, node);
    }
}

impl<'a> Visit<'a> for AsyncTaskPlanCollector<'_, 'a> {
    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &node.specifiers {
            let relevant = specifiers.iter().any(|specifier| match specifier {
                ImportDeclarationSpecifier::ImportSpecifier(specifier) => {
                    let imported = matches!(
                        &specifier.imported,
                        ModuleExportName::IdentifierName(name) if name.name == "asyncTask"
                    );
                    imported || specifier.local.name.as_str() == "asyncTask"
                }
                _ => false,
            });
            if relevant {
                self.imported_async_task = true;
                if specifiers.len() != 1 || !matches!(
                    &specifiers[0],
                    ImportDeclarationSpecifier::ImportSpecifier(specifier)
                        if matches!(&specifier.imported, ModuleExportName::IdentifierName(name) if name.name == "asyncTask")
                            && specifier.local.name.as_str() == "asyncTask"
                ) {
                    self.invalid_import = true;
                }
            }
        }
        walk::walk_import_declaration(self, node);
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let Expression::Identifier(identifier) = &node.callee {
            if identifier.name.as_str() == "asyncTask" {
                let resolves_to_import = identifier.reference_id.get()
                    .and_then(|reference_id| self.semantic.scoping().get_reference(reference_id).symbol_id())
                    .is_some_and(|symbol_id| matches!(
                        self.semantic.symbol_declaration(symbol_id).kind(),
                        AstKind::ImportSpecifier(_)
                    ));
                if resolves_to_import {
                    let parsed = (|| -> Result<(String, Vec<String>, Vec<String>), String> {
                        if node.arguments.len() != 2 && node.arguments.len() != 3 {
                            return Err("asyncTask expects an ID and callback, optionally preceded by a literal dependency array".to_owned());
                        }
                        let id = match &node.arguments[0] {
                            Argument::StringLiteral(literal) => literal.value.as_str().to_owned(),
                            _ => return Err("asyncTask ID must be a string literal".to_owned()),
                        };
                        let (dependency_argument, callback_argument) =
                            if node.arguments.len() == 3 {
                                (Some(&node.arguments[1]), &node.arguments[2])
                            } else {
                                (None, &node.arguments[1])
                            };
                        let dependencies = match dependency_argument {
                            Some(Argument::ArrayExpression(array)) => {
                                let mut dependencies = Vec::new();
                                for element in &array.elements {
                                    match element {
                                        ArrayExpressionElement::StringLiteral(literal) => {
                                            dependencies.push(literal.value.as_str().to_owned());
                                        }
                                        _ => return Err("asyncTask dependencies must be string literals".to_owned()),
                                    }
                                }
                                dependencies
                            }
                            Some(_) => return Err("asyncTask dependencies must be a literal array".to_owned()),
                            None => Vec::new(),
                        };
                        let input_symbol = match callback_argument {
                            Argument::ArrowFunctionExpression(callback) => {
                                async_task_input_symbol(&callback.params)
                            }
                            Argument::FunctionExpression(callback) => {
                                async_task_input_symbol(&callback.params)
                            }
                            _ => return Err("asyncTask implementation must be a function expression".to_owned()),
                        };
                        let mut read_collector = AsyncTaskInputReadCollector {
                            semantic: self.semantic,
                            input_symbol,
                            read_keys: Vec::new(),
                            invalid_dynamic_read: false,
                        };
                        match callback_argument {
                            Argument::ArrowFunctionExpression(callback) => {
                                read_collector.visit_arrow_function_expression(callback);
                            }
                            Argument::FunctionExpression(callback) => {
                                read_collector.visit_function(callback, ScopeFlags::Function);
                            }
                            _ => unreachable!(),
                        }
                        if read_collector.invalid_dynamic_read {
                            return Err("asyncTask input reads must use literal Map.get keys".to_owned());
                        }
                        Ok((id, dependencies, read_collector.read_keys))
                    })();
                    match parsed {
                        Ok((id, depends_on, inferred_reads)) => {
                            let site_id = format!("{}#async-task:{}", self.source_file, id);
                            self.tasks.push(AsyncTaskNodeIr {
                                id,
                                site_id,
                                depends_on,
                                inferred_reads,
                                call: span(node.span.start, node.span.end),
                            });
                        }
                        Err(error) => {
                            self.invalid_call.get_or_insert(error);
                        }
                    };
                }
            }
        }
        walk::walk_call_expression(self, node);
    }
}

fn slice(source: &str, span: SourceSpan) -> String {
    source
        .get(span.start as usize..span.end as usize)
        .unwrap_or_default()
        .to_owned()
}

fn span(start: u32, end: u32) -> SourceSpan {
    SourceSpan { start, end }
}

fn attribute_name(name: &JSXAttributeName<'_>) -> String {
    match name {
        JSXAttributeName::Identifier(identifier) => identifier.name.as_str().to_owned(),
        JSXAttributeName::NamespacedName(name) => {
            format!("{}:{}", name.namespace.name, name.name.name)
        }
    }
}

fn jsx_tag(name: &JSXElementName<'_>) -> Option<String> {
    match name {
        JSXElementName::Identifier(identifier) => Some(identifier.name.as_str().to_owned()),
        _ => None,
    }
}

fn simple_static_attributes(attributes: &[AttributeIr]) -> Vec<(String, String)> {
    attributes
        .iter()
        .filter(|attribute| attribute.name != "key")
        .filter_map(|attribute| {
            attribute
                .static_value
                .as_ref()
                .map(|value| (attribute.name.clone(), value.clone()))
        })
        .collect()
}

fn style_object_property_count(attribute: &oxc_ast::ast::JSXAttribute<'_>) -> Option<usize> {
    let JSXAttributeValue::ExpressionContainer(container) = attribute.value.as_ref()? else {
        return None;
    };
    let oxc_ast::ast::JSXExpression::ObjectExpression(style_object) = &container.expression else {
        return None;
    };
    Some(style_object.properties.len())
}

fn compact_whitespace(source: &str) -> String {
    source
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect()
}

fn binding_source_path(expression: &str, item_parameter: &str) -> Option<String> {
    let compact = compact_whitespace(expression);
    let path = if compact == item_parameter {
        compact.as_str()
    } else {
        compact.strip_prefix(&format!("{item_parameter}."))?
    };
    let segments: Vec<_> = path.split('.').collect();
    if segments.is_empty()
        || segments.iter().any(|segment| {
            let mut chars = segment.chars();
            !chars
                .next()
                .is_some_and(|first| first == '_' || first == '$' || first.is_ascii_alphabetic())
                || chars.any(|character| {
                    character != '_' && character != '$' && !character.is_ascii_alphanumeric()
                })
        })
    {
        return None;
    }
    Some(compact)
}

fn shared_source_path(expression: &str) -> Option<String> {
    let compact = compact_whitespace(expression);
    let mut segments = compact.split('.');
    let root = segments.next()?;
    if root.is_empty() || segments.clone().next().is_none() {
        return None;
    }
    if !root.chars().enumerate().all(|(index, character)| {
        if index == 0 {
            character == '_' || character == '$' || character.is_ascii_alphabetic()
        } else {
            character == '_' || character == '$' || character.is_ascii_alphanumeric()
        }
    }) {
        return None;
    }
    if !segments.clone().all(|segment| {
        let mut chars = segment.chars();
        chars
            .next()
            .is_some_and(|first| first == '_' || first == '$' || first.is_ascii_alphabetic())
            && chars.all(|character| {
                character == '_' || character == '$' || character.is_ascii_alphanumeric()
            })
    }) {
        return None;
    }
    Some(compact)
}

struct PredicateSourceCollector<'s, 'a> {
    semantic: &'s Semantic<'a>,
    item_parameter: String,
    sources: BTreeSet<String>,
}

impl<'a> Visit<'a> for PredicateSourceCollector<'_, 'a> {
    fn visit_identifier_reference(&mut self, node: &oxc_ast::ast::IdentifierReference<'a>) {
        let name = node.name.as_str();
        if name != self.item_parameter {
            let is_parameter = node
                .reference_id
                .get()
                .and_then(|reference_id| {
                    self.semantic
                        .scoping()
                        .get_reference(reference_id)
                        .symbol_id()
                })
                .is_some_and(|symbol_id| {
                    matches!(
                        self.semantic.symbol_declaration(symbol_id).kind(),
                        AstKind::FormalParameter(_)
                    )
                });
            if is_parameter {
                self.sources.insert(name.to_owned());
            }
        }
    }
}

fn parameter_root_of_argument<'a>(
    argument: &'a Argument<'a>,
) -> Option<&'a oxc_ast::ast::IdentifierReference<'a>> {
    fn root<'a>(
        expression: &'a Expression<'a>,
    ) -> Option<&'a oxc_ast::ast::IdentifierReference<'a>> {
        match expression {
            Expression::Identifier(identifier) => Some(identifier),
            Expression::StaticMemberExpression(member) => root(&member.object),
            _ => None,
        }
    }
    match argument {
        Argument::Identifier(identifier) => Some(identifier),
        Argument::StaticMemberExpression(member) => root(&member.object),
        _ => None,
    }
}

fn binding_property(
    attribute: &oxc_ast::ast::JSXAttribute<'_>,
    call_span: &SourceSpan,
) -> Option<String> {
    let JSXAttributeValue::ExpressionContainer(container) = attribute.value.as_ref()? else {
        return None;
    };
    let oxc_ast::ast::JSXExpression::ObjectExpression(style_object) = &container.expression else {
        return None;
    };
    for property in &style_object.properties {
        let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) = property else {
            continue;
        };
        let value_span = property.value.span();
        if call_span.start < value_span.start || call_span.end > value_span.end {
            continue;
        }
        let oxc_ast::ast::PropertyKey::StaticIdentifier(key) = &property.key else {
            return None;
        };
        if matches!(property.value, Expression::CallExpression(_)) {
            return Some(key.name.as_str().to_owned());
        }
    }
    None
}

fn arrow_parameter<'a>(arrow: &oxc_ast::ast::ArrowFunctionExpression<'a>) -> Option<String> {
    let first = arrow.params.items.first()?;
    let BindingPattern::BindingIdentifier(identifier) = &first.pattern else {
        return None;
    };
    Some(identifier.name.as_str().to_owned())
}

fn compile_repeated_host_plan(collector: &Collector<'_, '_>) -> Result<RepeatedHostPlan, String> {
    let map = collector.maps.first().ok_or_else(|| {
        "unsupported template: expected an array.map((item, index) => <host />) child".to_owned()
    })?;
    let root = collector
        .nodes
        .iter()
        .filter(|node| {
            node.span.start <= map.element_span.start && node.span.end >= map.element_span.end
        })
        .max_by_key(|node| node.span.end - node.span.start)
        .ok_or_else(|| "unsupported template: could not find a containing host root".to_owned())?;
    let item = collector
        .nodes
        .iter()
        .find(|node| {
            node.span.start == map.element_span.start && node.span.end == map.element_span.end
        })
        .ok_or_else(|| {
            "unsupported template: map callback must directly return one intrinsic host".to_owned()
        })?;
    if root.id == item.id {
        return Err(
            "unsupported template: repeated host must be nested under a distinct root host"
                .to_owned(),
        );
    }

    if !root.bindings.is_empty() || root.attributes.iter().any(|attribute| attribute.dynamic) {
        return Err(
            "unsupported template: root host only supports static string attributes".to_owned(),
        );
    }
    if item
        .attributes
        .iter()
        .any(|attribute| attribute.dynamic && attribute.name != "style" && attribute.name != "key")
    {
        let unsupported = item
            .attributes
            .iter()
            .find(|attribute| {
                attribute.dynamic && attribute.name != "style" && attribute.name != "key"
            })
            .map(|attribute| attribute.name.as_str())
            .unwrap_or("unknown");
        return Err(format!("unsupported template: dynamic host attribute `{unsupported}` is not represented by the compiled plan"));
    }
    let style_attribute_count = item
        .attributes
        .iter()
        .filter(|attribute| attribute.name == "style")
        .count();
    if style_attribute_count != 1 {
        return Err("unsupported template: expected exactly one style object containing the repeated host bindings".to_owned());
    }
    if let Some(key) = item
        .attributes
        .iter()
        .find(|attribute| attribute.name == "key")
    {
        let expected_key = format!("key={{{}}}", map.index_parameter);
        if compact_whitespace(&key.source) != expected_key {
            return Err(format!(
                "unsupported template: repeated host key must use the map index `{}`",
                map.index_parameter
            ));
        }
    }

    let root_static_attributes = simple_static_attributes(&root.attributes);
    let item_static_attributes = simple_static_attributes(&item.attributes);
    if item.bindings.is_empty() {
        return Err(
            "unsupported template: repeated host needs at least one imported bind() prop"
                .to_owned(),
        );
    }
    let mut bindings = Vec::with_capacity(item.bindings.len());
    for binding in &item.bindings {
        let Some(property) = binding
            .host_property
            .as_deref()
            .and_then(|path| path.strip_prefix("style."))
        else {
            return Err(
                "unsupported template: each binding must target a static style property".to_owned(),
            );
        };
        if !binding.callee_resolves_to_import {
            return Err(
                "unsupported template: bind() must resolve to an imported binding helper"
                    .to_owned(),
            );
        }
        let (source_scope, source_path) = if let Some(path) =
            binding_source_path(&binding.source_expression, &map.item_parameter)
        {
            ("item", path)
        } else if binding.source_root_resolves_to_parameter {
            let path = shared_source_path(&binding.source_expression).ok_or_else(|| {
                "unsupported template: shared binding source must be a static dotted path"
                    .to_owned()
            })?;
            ("shared", path)
        } else {
            return Err(format!("unsupported template: binding source must be the map item `{}` or a static dotted path rooted in a shared input", map.item_parameter));
        };
        bindings.push(RepeatedBindingPlan {
            property: property.to_owned(),
            source_scope: source_scope.to_owned(),
            source_path,
            source_slot: 0,
            projection_parameter: binding.projection_parameter.clone().ok_or_else(|| {
                "unsupported template: projector must have one identifier parameter".to_owned()
            })?,
            projection_body_expression: binding.projection_body_expression.clone().ok_or_else(
                || "unsupported template: projector must use an expression body".to_owned(),
            )?,
        });
    }
    bindings.sort_by(|left, right| left.property.cmp(&right.property));
    if bindings
        .windows(2)
        .any(|pair| pair[0].property == pair[1].property)
    {
        return Err(
            "unsupported template: a repeated host cannot bind the same style property twice"
                .to_owned(),
        );
    }

    let source_paths: Vec<_> = bindings
        .iter()
        .filter(|binding| binding.source_scope == "item")
        .map(|binding| binding.source_path.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    for binding in &mut bindings {
        if binding.source_scope == "item" {
            binding.source_slot =
                source_paths
                    .binary_search(&binding.source_path)
                    .map_err(|_| {
                        "internal compiler error: source path missing from dependency table"
                            .to_owned()
                    })?;
        }
    }
    let mut source_binding_offsets = vec![0];
    let mut binding_ids = Vec::with_capacity(bindings.len());
    for source_slot in 0..source_paths.len() {
        for (binding_id, binding) in bindings.iter().enumerate() {
            if binding.source_scope == "item" && binding.source_slot == source_slot {
                binding_ids.push(binding_id);
            }
        }
        source_binding_offsets.push(binding_ids.len());
    }
    let shared_source_paths: Vec<_> = bindings
        .iter()
        .filter(|binding| binding.source_scope == "shared")
        .map(|binding| binding.source_path.clone())
        .collect::<BTreeSet<_>>()
        .into_iter()
        .collect();
    for binding in &mut bindings {
        if binding.source_scope == "shared" {
            binding.source_slot = shared_source_paths
                .binary_search(&binding.source_path)
                .map_err(|_| {
                    "internal compiler error: shared source path missing from dependency table"
                        .to_owned()
                })?;
        }
    }
    let mut shared_source_binding_offsets = vec![0];
    let mut shared_binding_ids = Vec::with_capacity(bindings.len());
    for source_slot in 0..shared_source_paths.len() {
        for (binding_id, binding) in bindings.iter().enumerate() {
            if binding.source_scope == "shared" && binding.source_slot == source_slot {
                shared_binding_ids.push(binding_id);
            }
        }
        shared_source_binding_offsets.push(shared_binding_ids.len());
    }
    let dependency_graph = DependencyGraphIr {
        source_count: source_paths.len(),
        source_paths,
        source_binding_offsets,
        binding_ids,
        shared_source_count: shared_source_paths.len(),
        shared_source_paths,
        shared_source_binding_offsets,
        shared_binding_ids,
    };

    Ok(RepeatedHostPlan {
        collection_expression: map.collection_expression.clone(),
        item_parameter: map.item_parameter.clone(),
        index_parameter: map.index_parameter.clone(),
        root_tag: root.tag.clone(),
        root_static_attributes,
        item_tag: item.tag.clone(),
        item_static_attributes,
        binding_source_parameter: map.item_parameter.clone(),
        bindings,
        dependency_graph,
    })
}

fn jsx_attribute_expression(attribute: &AttributeIr) -> Option<String> {
    let compact = compact_whitespace(&attribute.source);
    let prefix = format!("{}={{", attribute.name);
    Some(compact.strip_prefix(&prefix)?.strip_suffix('}')?.to_owned())
}

fn compile_derived_keyed_region(
    collector: &Collector<'_, '_>,
    source_file: &str,
) -> Result<Option<DerivedKeyedRegionPlan>, String> {
    let Some(map) = collector.maps.first() else {
        return Ok(None);
    };
    let map_collection = compact_whitespace(&map.collection_expression);
    let Some(filter) = collector
        .filters
        .iter()
        .find(|filter| compact_whitespace(&filter.output_binding) == map_collection)
    else {
        return Ok(None);
    };

    let root = collector
        .nodes
        .iter()
        .filter(|node| {
            node.span.start <= map.element_span.start && node.span.end >= map.element_span.end
        })
        .max_by_key(|node| node.span.end - node.span.start)
        .ok_or_else(|| {
            "unsupported derived region: could not find containing host root".to_owned()
        })?;
    let item = collector
        .nodes
        .iter()
        .find(|node| {
            node.span.start == map.element_span.start && node.span.end == map.element_span.end
        })
        .ok_or_else(|| {
            "unsupported derived region: map callback must directly return one intrinsic host"
                .to_owned()
        })?;
    if root.id == item.id {
        return Err(
            "unsupported derived region: repeated item must be nested under a distinct root"
                .to_owned(),
        );
    }

    let keys: Vec<_> = item
        .attributes
        .iter()
        .filter(|attribute| attribute.name == "key")
        .collect();
    if keys.len() != 1 {
        return Err(
            "unsupported derived region: repeated item needs exactly one key expression".to_owned(),
        );
    }
    let key_expression = jsx_attribute_expression(keys[0])
        .ok_or_else(|| "unsupported derived region: key must be a simple expression".to_owned())?;
    let item_key_path = binding_source_path(&key_expression, &map.item_parameter)
        .filter(|path| path != &map.item_parameter)
        .ok_or_else(|| {
            "unsupported derived region: key must be a static path rooted in the map item"
                .to_owned()
        })?;

    let collection_source = compact_whitespace(&filter.collection_source);
    if !collection_source
        .chars()
        .enumerate()
        .all(|(index, character)| {
            if index == 0 {
                character == '_' || character == '$' || character.is_ascii_alphabetic()
            } else {
                character == '_' || character == '$' || character.is_ascii_alphanumeric()
            }
        })
    {
        return Err(
            "unsupported derived region: filtered collection must be a named input".to_owned(),
        );
    }
    let mut source_paths: BTreeSet<String> = filter.predicate_sources.iter().cloned().collect();
    source_paths.insert(collection_source.clone());
    let source_paths: Vec<_> = source_paths.into_iter().collect();
    let mut source_region_offsets = vec![0];
    let mut region_ids = Vec::with_capacity(source_paths.len());
    for _ in &source_paths {
        region_ids.push(0);
        source_region_offsets.push(region_ids.len());
    }

    Ok(Some(DerivedKeyedRegionPlan {
        schema_version: 1,
        source_file: source_file.to_owned(),
        collection_source,
        predicate_sources: filter.predicate_sources.clone(),
        collection_binding: filter.output_binding.clone(),
        item_parameter: map.item_parameter.clone(),
        item_key_path,
        root_tag: root.tag.clone(),
        item_tag: item.tag.clone(),
        region_id: 0,
        dependency_graph: DerivedRegionGraphIr {
            source_count: source_paths.len(),
            source_paths,
            source_region_offsets,
            region_ids,
        },
    }))
}

fn compile_derived_keyed_regions(
    collector: &Collector<'_, '_>,
    source_file: &str,
) -> Result<DerivedKeyedRegionsPlan, String> {
    let mut regions = Vec::new();
    let mut edges_by_source = BTreeMap::<String, BTreeSet<usize>>::new();

    for map in &collector.maps {
        let map_collection = compact_whitespace(&map.collection_expression);
        let Some(filter) = collector
            .filters
            .iter()
            .find(|filter| compact_whitespace(&filter.output_binding) == map_collection)
        else {
            continue;
        };

        let item = collector
            .nodes
            .iter()
            .find(|node| {
                node.span.start == map.element_span.start && node.span.end == map.element_span.end
            })
            .ok_or_else(|| {
                "unsupported derived region: map callback must directly return one intrinsic host"
                    .to_owned()
            })?;
        let root = collector
            .nodes
            .iter()
            .filter(|node| {
                node.id != item.id
                    && node.span.start <= map.element_span.start
                    && node.span.end >= map.element_span.end
            })
            .min_by_key(|node| node.span.end - node.span.start)
            .ok_or_else(|| {
                "unsupported derived region: could not find closest containing host root".to_owned()
            })?;
        let keys: Vec<_> = item
            .attributes
            .iter()
            .filter(|attribute| attribute.name == "key")
            .collect();
        if keys.len() != 1 {
            return Err(
                "unsupported derived region: repeated item needs exactly one key expression"
                    .to_owned(),
            );
        }
        let key_expression = jsx_attribute_expression(keys[0]).ok_or_else(|| {
            "unsupported derived region: key must be a simple expression".to_owned()
        })?;
        let item_key_path = binding_source_path(&key_expression, &map.item_parameter)
            .filter(|path| path != &map.item_parameter)
            .ok_or_else(|| {
                "unsupported derived region: key must be a static path rooted in the map item"
                    .to_owned()
            })?;

        let collection_source = compact_whitespace(&filter.collection_source);
        if !collection_source
            .chars()
            .enumerate()
            .all(|(index, character)| {
                if index == 0 {
                    character == '_' || character == '$' || character.is_ascii_alphabetic()
                } else {
                    character == '_' || character == '$' || character.is_ascii_alphanumeric()
                }
            })
        {
            return Err(
                "unsupported derived region: filtered collection must be a named input".to_owned(),
            );
        }
        let region_id = regions.len();
        let mut sources = BTreeSet::from([collection_source.clone()]);
        sources.extend(filter.predicate_sources.iter().cloned());
        for source in sources {
            edges_by_source.entry(source).or_default().insert(region_id);
        }
        regions.push(DerivedKeyedRegionIr {
            region_id,
            collection_source,
            predicate_sources: filter.predicate_sources.clone(),
            collection_binding: filter.output_binding.clone(),
            item_parameter: map.item_parameter.clone(),
            item_key_path,
            root_tag: root.tag.clone(),
            item_tag: item.tag.clone(),
        });
    }

    if regions.len() < 2 {
        return Err(
            "unsupported derived regions: expected at least two independently derived keyed maps"
                .to_owned(),
        );
    }
    let source_paths: Vec<_> = edges_by_source.keys().cloned().collect();
    let mut source_region_offsets = vec![0];
    let mut region_ids = Vec::new();
    for source in &source_paths {
        region_ids.extend(edges_by_source.get(source).into_iter().flatten().copied());
        source_region_offsets.push(region_ids.len());
    }
    Ok(DerivedKeyedRegionsPlan {
        schema_version: 2,
        source_file: source_file.to_owned(),
        regions,
        dependency_graph: DerivedRegionGraphIr {
            source_count: source_paths.len(),
            source_paths,
            source_region_offsets,
            region_ids,
        },
    })
}

fn generated_derived_region_module(plan: &DerivedKeyedRegionPlan) -> Result<String, String> {
    serde_json::to_string(plan)
        .map(|json| format!("export const keyedFilterRegionPlan = {json} as const;\n"))
        .map_err(|error| error.to_string())
}

fn generated_derived_regions_module(plan: &DerivedKeyedRegionsPlan) -> Result<String, String> {
    serde_json::to_string(plan)
        .map(|json| format!("export const keyedFilterRegionsPlan = {json} as const;\n"))
        .map_err(|error| error.to_string())
}

fn generated_component_state_sites_module(plan: &ComponentStateSitesPlan) -> Result<String, String> {
    serde_json::to_string(plan)
        .map(|json| format!("// Generated by the OXC UI graph compiler. Do not edit by hand.\nexport const componentStateSitesPlan = {json} as const;\n"))
        .map_err(|error| error.to_string())
}

fn generated_async_task_plan_module(plan: &AsyncTaskPlanIr) -> Result<String, String> {
    serde_json::to_string(plan)
        .map(|json| format!("// Generated by the OXC UI graph compiler. Do not edit by hand.\nexport const compiledAsyncTaskPlan = {json} as const;\n"))
        .map_err(|error| error.to_string())
}

struct TextEdit {
    start: usize,
    end: usize,
    replacement: String,
}

fn transform_component_state_source(
    source: &str,
    plan: &ComponentStateSitesPlan,
    runtime_import: &str,
    jsx_import: &str,
) -> Result<String, String> {
    let import_span = plan.hook_import.as_ref().ok_or_else(|| {
        "unsupported transform: expected one named `useState` and/or `useEffect` import"
    })?;
    let mut edits = Vec::new();
    let runtime_import = serde_json::to_string(runtime_import).map_err(|error| error.to_string())?;
    let jsx_import = serde_json::to_string(jsx_import).map_err(|error| error.to_string())?;
    edits.push(TextEdit {
        start: import_span.start as usize,
        end: import_span.end as usize,
        replacement: format!(
            "import {{ defineComponent as __uiDefineComponent, useStateAt as __uiUseStateAt, useEffectAt as __uiUseEffectAt }} from {runtime_import};\nimport {{ jsx, Fragment, keyedOwnerChildren as __uiKeyedOwnerChildren }} from {jsx_import};"
        ),
    });

    for component in &plan.components {
        let function_span = &component.declaration;
        let function_source = slice(source, function_span.clone());
        let expected_prefix = format!("function {}", component.name);
        if !function_source.starts_with(&expected_prefix) {
            return Err(format!(
                "unsupported transform: component `{}` must be a synchronous function declaration",
                component.name
            ));
        }
        let site_id = serde_json::to_string(&component.component_site_id)
            .map_err(|error| error.to_string())?;
        edits.push(TextEdit {
            start: function_span.start as usize,
            end: function_span.start as usize + expected_prefix.len(),
            replacement: format!(
                "const {} = __uiDefineComponent({}, function {}",
                component.name, site_id, component.name
            ),
        });
        edits.push(TextEdit {
            start: function_span.end as usize,
            end: function_span.end as usize,
            replacement: ");".to_owned(),
        });

        for state_site in &component.state_sites {
            let call_source = slice(source, state_site.call.clone());
            let open = call_source.find('(').ok_or_else(|| {
                format!("internal transform error: missing `(` for {}", state_site.site_id)
            })?;
            let close = call_source.rfind(')').ok_or_else(|| {
                format!("internal transform error: missing `)` for {}", state_site.site_id)
            })?;
            if close < open {
                return Err(format!("internal transform error: invalid call span for {}", state_site.site_id));
            }
            let arguments = call_source[open + 1..close].trim();
            let arguments = if arguments.is_empty() { "undefined" } else { arguments };
            let site_id = serde_json::to_string(&state_site.site_id)
                .map_err(|error| error.to_string())?;
            edits.push(TextEdit {
                start: state_site.call.start as usize,
                end: state_site.call.end as usize,
                replacement: format!("__uiUseStateAt({site_id}, {arguments})"),
            });
        }

        for effect_site in &component.effect_sites {
            if effect_site.argument_count != 1 {
                return Err(format!(
                    "unsupported transform: useEffect at {} must have exactly one callback; model changing inputs as graph dependencies",
                    effect_site.site_id
                ));
            }
            let call_source = slice(source, effect_site.call.clone());
            let open = call_source.find('(').ok_or_else(|| {
                format!("internal transform error: missing `(` for {}", effect_site.site_id)
            })?;
            let close = call_source.rfind(')').ok_or_else(|| {
                format!("internal transform error: missing `)` for {}", effect_site.site_id)
            })?;
            if close < open {
                return Err(format!("internal transform error: invalid call span for {}", effect_site.site_id));
            }
            let arguments = call_source[open + 1..close].trim();
            let site_id = serde_json::to_string(&effect_site.site_id)
                .map_err(|error| error.to_string())?;
            edits.push(TextEdit {
                start: effect_site.call.start as usize,
                end: effect_site.call.end as usize,
                replacement: format!("__uiUseEffectAt({site_id}, {arguments})"),
            });
        }
    }

    edits.sort_by(|left, right| right.start.cmp(&left.start).then(right.end.cmp(&left.end)));
    let mut transformed = source.to_owned();
    let mut previous_start = source.len();
    for edit in edits {
        if edit.end > previous_start || edit.start > edit.end || edit.end > transformed.len() {
            return Err("internal transform error: overlapping or out-of-bounds source edits".to_owned());
        }
        transformed.replace_range(edit.start..edit.end, &edit.replacement);
        previous_start = edit.start;
    }
    Ok(format!("/** @jsxRuntime classic */\n/** @jsx jsx */\n/** @jsxFrag Fragment */\n{transformed}"))
}

fn static_props_source(attributes: &[(String, String)]) -> Result<String, String> {
    let values = attributes
        .iter()
        .map(|(name, value)| {
            Ok(format!(
                "{}: {}",
                serde_json::to_string(name).map_err(|error| error.to_string())?,
                serde_json::to_string(value).map_err(|error| error.to_string())?
            ))
        })
        .collect::<Result<Vec<_>, String>>()?;
    Ok(format!("{{ {} }}", values.join(", ")))
}

fn generated_writer_method(plan: &RepeatedHostPlan, scope: &str) -> Result<String, String> {
    let source_paths = if scope == "item" {
        &plan.dependency_graph.source_paths
    } else {
        &plan.dependency_graph.shared_source_paths
    };
    let method = if scope == "item" {
        "writeItem"
    } else {
        "writeShared"
    };
    let empty_string = serde_json::to_string("").map_err(|error| error.to_string())?;
    let mut input_name = "__ui_source_value".to_owned();
    while plan.bindings.iter().any(|binding| {
        binding.projection_parameter == input_name
            || binding.projection_body_expression.contains(&input_name)
    }) {
        input_name.push('_');
    }
    let mut output = format!(
        "{method}(element: HTMLElement, sourceSlot: number, {input_name}: number) {{\n  switch (sourceSlot) {{\n"
    );
    for source_slot in 0..source_paths.len() {
        output.push_str(&format!("    case {source_slot}: {{\n"));
        for (binding_id, binding) in plan.bindings.iter().enumerate().filter(|(_, binding)| {
            binding.source_scope == scope && binding.source_slot == source_slot
        }) {
            let property =
                serde_json::to_string(&binding.property).map_err(|error| error.to_string())?;
            let mut projected = format!("__ui_projected_{binding_id}");
            while plan.bindings.iter().any(|candidate| {
                candidate.projection_parameter == projected
                    || candidate.projection_body_expression.contains(&projected)
            }) {
                projected.push('_');
            }
            output.push_str(&format!(
                "      {{\n        const {} = {input_name};\n        const {projected} = ({});\n",
                binding.projection_parameter, binding.projection_body_expression
            ));
            if binding.property.starts_with("--") {
                output.push_str(&format!(
                    "        element.style.setProperty({property}, {projected} == null ? {empty_string} : String({projected}));\n"
                ));
            } else {
                output.push_str(&format!(
                    "        (element.style as any)[{property}] = {projected} == null ? {empty_string} : {projected};\n"
                ));
            }
            output.push_str("      }\n");
        }
        output.push_str("      return;\n    }\n");
    }
    let error_message =
        serde_json::to_string(&format!("Generated {scope} source slot out of range: "))
            .map_err(|error| error.to_string())?;
    output.push_str(&format!(
        "    default: throw new RangeError({error_message} + sourceSlot);\n  }}\n}}"
    ));
    Ok(output)
}
fn generated_module(plan: &RepeatedHostPlan) -> Result<String, String> {
    let root_props = static_props_source(&plan.root_static_attributes)?;
    let item_props = static_props_source(&plan.item_static_attributes)?;
    let bindings = plan.bindings.iter().map(|binding| {
        Ok(format!(
            "{{ property: {}, sourceScope: {}, sourcePath: {}, sourceSlot: {}, project: ({}: number): unknown => {} }}",
            serde_json::to_string(&binding.property).map_err(|error| error.to_string())?,
            serde_json::to_string(&binding.source_scope).map_err(|error| error.to_string())?,
            serde_json::to_string(&binding.source_path).map_err(|error| error.to_string())?,
            binding.source_slot,
            binding.projection_parameter,
            binding.projection_body_expression,
        ))
    }).collect::<Result<Vec<_>, String>>()?.join(", ");
    let dependency_offsets = serde_json::to_string(&plan.dependency_graph.source_binding_offsets)
        .map_err(|error| error.to_string())?;
    let dependency_bindings = serde_json::to_string(&plan.dependency_graph.binding_ids)
        .map_err(|error| error.to_string())?;
    let dependency_paths = serde_json::to_string(&plan.dependency_graph.source_paths)
        .map_err(|error| error.to_string())?;
    let shared_dependency_offsets =
        serde_json::to_string(&plan.dependency_graph.shared_source_binding_offsets)
            .map_err(|error| error.to_string())?;
    let shared_dependency_bindings =
        serde_json::to_string(&plan.dependency_graph.shared_binding_ids)
            .map_err(|error| error.to_string())?;
    let shared_dependency_paths = serde_json::to_string(&plan.dependency_graph.shared_source_paths)
        .map_err(|error| error.to_string())?;
    let item_writer = generated_writer_method(plan, "item")?;
    let shared_writer = generated_writer_method(plan, "shared")?;
    let generated = format!(
        "// Generated by the OXC UI graph compiler. Do not edit by hand.\n\
         import {{ mountRepeatedHostPlan, type RepeatedHostPlan, type RepeatedPlanSource, type RepeatedHostWriters }} from \"../compiled_plan_runtime.ts\";\n\
         export const bindingParticlesPlan = {{\n\
           rootTag: {}, rootProps: {},\n\
           itemTag: {}, itemProps: {},\n\
           sourceTargetLayout: \"identity\",\n\
           bindings: [{}],\n\
           dependencyGraph: {{ sourceCount: {}, sourcePaths: {}, sourceBindingOffsets: {}, bindingIds: {}, sharedSourceCount: {}, sharedSourcePaths: {}, sharedSourceBindingOffsets: {}, sharedBindingIds: {} }},\n\
         }} satisfies RepeatedHostPlan;\n\
         export const bindingParticlesWriters: RepeatedHostWriters = {{\n\
           {},\n\
           {},\n\
         }};\n\
         export function mountGeneratedBindingParticles(sources: readonly RepeatedPlanSource[], container: HTMLElement, sharedSourceValues: readonly number[] = []) {{\n\
           return mountRepeatedHostPlan(sources, container, bindingParticlesPlan, sharedSourceValues, bindingParticlesWriters);\n\
         }}\n",
        serde_json::to_string(&plan.root_tag).map_err(|error| error.to_string())?,
        root_props,
        serde_json::to_string(&plan.item_tag).map_err(|error| error.to_string())?,
        item_props,
        bindings,
        plan.dependency_graph.source_count,
        dependency_paths,
        dependency_offsets,
        dependency_bindings,
        plan.dependency_graph.shared_source_count,
        shared_dependency_paths,
        shared_dependency_offsets,
        shared_dependency_bindings,
        item_writer,
        shared_writer,
    );
    Ok(generated)
}

impl<'a> Visit<'a> for Collector<'_, 'a> {
    fn visit_jsx_element(&mut self, node: &JSXElement<'a>) {
        // Visit child expressions first so bind() call spans are available when
        // this element associates them with the containing JSX attribute.
        walk::walk_jsx_element(self, node);

        let Some(tag) = jsx_tag(&node.opening_element.name) else {
            return;
        };

        let mut attributes = Vec::new();
        let mut bindings = Vec::new();
        for item in &node.opening_element.attributes {
            let JSXAttributeItem::Attribute(attribute) = item else {
                continue;
            };
            let name = attribute_name(&attribute.name);
            let attribute_span = span(attribute.span.start, attribute.span.end);
            let attribute_source =
                slice(self.source, span(attribute.span.start, attribute.span.end));
            let matched_calls: Vec<_> = self
                .calls
                .iter()
                .filter(|call| {
                    call.span.start >= attribute.span.start && call.span.end <= attribute.span.end
                })
                .cloned()
                .collect();

            if !matched_calls.is_empty()
                && style_object_property_count(attribute) != Some(matched_calls.len())
            {
                self.unsupported_binding_attributes
                    .push(attribute_span.clone());
            }

            if matched_calls.is_empty() {
                let static_value = attribute.value.as_ref().and_then(|value| match value {
                    JSXAttributeValue::StringLiteral(literal) => Some(literal.value.to_string()),
                    _ => None,
                });
                attributes.push(AttributeIr {
                    name,
                    span: attribute_span,
                    source: attribute_source,
                    dynamic: static_value.is_none(),
                    static_value,
                });
                continue;
            }

            for call in matched_calls {
                let source_expression = call.args.first().cloned().unwrap_or_default();
                let projection_expression = call.args.get(1).cloned();
                bindings.push(BindingIr {
                    attribute: name.clone(),
                    source_expression,
                    projection_expression,
                    host_property: binding_property(attribute, &call.span)
                        .map(|property| format!("{name}.{property}")),
                    projection_parameter: call.projection_parameter.clone(),
                    projection_body_expression: call.projection_body_expression.clone(),
                    callee_resolves_to_import: call.callee_resolves_to_import,
                    source_root_resolves_to_parameter: call.source_root_resolves_to_parameter,
                    span: call.span,
                });
            }
            attributes.push(AttributeIr {
                name,
                span: attribute_span,
                source: attribute_source,
                dynamic: true,
                static_value: None,
            });
        }

        let id = self.nodes.len();
        self.nodes.push(HostNodeIr {
            id,
            tag,
            span: span(node.span.start, node.span.end),
            attributes,
            bindings,
        });
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let Expression::StaticMemberExpression(member) = &node.callee {
            if member.property.name == "map" {
                let collection_expression = slice(
                    self.source,
                    span(member.object.span().start, member.object.span().end),
                );
                if let Some(Argument::ArrowFunctionExpression(arrow)) = node.arguments.first() {
                    let params = &arrow.params.items;
                    let pattern_name = |index: usize| -> Option<String> {
                        let pattern = &params.get(index)?.pattern;
                        let BindingPattern::BindingIdentifier(identifier) = pattern else {
                            return None;
                        };
                        Some(identifier.name.as_str().to_owned())
                    };
                    if let Some(Expression::JSXElement(element)) = arrow.body.as_expression() {
                        if let Some(item_parameter) = pattern_name(0) {
                            self.maps.push(MapIr {
                                collection_expression,
                                item_parameter,
                                // The index is optional in JavaScript's map callback.
                                // Existing repeated-host plans keep a stable placeholder
                                // when a template doesn't declare it; derived keyed
                                // regions only need the item parameter.
                                index_parameter: pattern_name(1)
                                    .unwrap_or_else(|| "_index".to_owned()),
                                element_span: span(element.span.start, element.span.end),
                            });
                        }
                    }
                }
            }
        }
        if let Expression::Identifier(identifier) = &node.callee {
            if identifier.name == "bind" {
                let callee_resolves_to_import = identifier
                    .reference_id
                    .get()
                    .and_then(|reference_id| {
                        self.semantic
                            .scoping()
                            .get_reference(reference_id)
                            .symbol_id()
                    })
                    .is_some_and(|symbol_id| {
                        matches!(
                            self.semantic.symbol_declaration(symbol_id).kind(),
                            AstKind::ImportSpecifier(_)
                        )
                    });
                let args = node
                    .arguments
                    .iter()
                    .map(|argument: &Argument<'a>| {
                        slice(
                            self.source,
                            span(argument.span().start, argument.span().end),
                        )
                    })
                    .collect();
                let source_root_resolves_to_parameter = node
                    .arguments
                    .first()
                    .and_then(parameter_root_of_argument)
                    .and_then(|identifier| identifier.reference_id.get())
                    .and_then(|reference_id| {
                        self.semantic
                            .scoping()
                            .get_reference(reference_id)
                            .symbol_id()
                    })
                    .is_some_and(|symbol_id| {
                        matches!(
                            self.semantic.symbol_declaration(symbol_id).kind(),
                            AstKind::FormalParameter(_)
                        )
                    });
                let (projection_parameter, projection_body_expression) =
                    if let Some(Argument::ArrowFunctionExpression(arrow)) = node.arguments.get(1) {
                        if let Some(expression) = arrow.body.as_expression() {
                            (
                                arrow_parameter(arrow),
                                Some(slice(
                                    self.source,
                                    span(expression.span().start, expression.span().end),
                                )),
                            )
                        } else {
                            (None, None)
                        }
                    } else {
                        (None, None)
                    };
                self.calls.push(CallIr {
                    span: span(node.span.start, node.span.end),
                    args,
                    callee_resolves_to_import,
                    source_root_resolves_to_parameter,
                    projection_parameter,
                    projection_body_expression,
                });
            }
        }
        walk::walk_call_expression(self, node);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let (
            BindingPattern::BindingIdentifier(output_binding),
            Some(Expression::CallExpression(call)),
        ) = (&node.id, node.init.as_ref())
        {
            if let Expression::StaticMemberExpression(member) = &call.callee {
                if member.property.name == "filter" {
                    if let Some(Argument::ArrowFunctionExpression(predicate)) =
                        call.arguments.first()
                    {
                        if let Some(item_parameter) = arrow_parameter(predicate) {
                            let mut references = PredicateSourceCollector {
                                semantic: self.semantic,
                                item_parameter,
                                sources: BTreeSet::new(),
                            };
                            if let Some(expression) = predicate.body.as_expression() {
                                references.visit_expression(expression);
                            }
                            self.filters.push(FilterIr {
                                output_binding: output_binding.name.as_str().to_owned(),
                                collection_source: slice(
                                    self.source,
                                    span(member.object.span().start, member.object.span().end),
                                ),
                                predicate_sources: references.sources.into_iter().collect(),
                            });
                        }
                    }
                }
            }
        }
        walk::walk_variable_declarator(self, node);
    }
}

fn run() -> Result<(), String> {
    let path = env::args().nth(1).ok_or_else(|| {
        "usage: ui-graph-compiler-spike <input.tsx> [--out <output.json>]".to_owned()
    })?;
    let source = fs::read_to_string(&path).map_err(|error| format!("{path}: {error}"))?;
    let source_type = SourceType::from_path(&path)
        .map_err(|_| format!("unsupported source extension: {path}"))?;
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, &source, source_type).parse();
    if !parsed.diagnostics.is_empty() || parsed.fatal_error {
        let diagnostics = parsed
            .diagnostics
            .iter()
            .map(|diagnostic| diagnostic.to_string())
            .collect::<Vec<_>>()
            .join("\n");
        return Err(if diagnostics.is_empty() {
            format!("{path}: parser could not recover")
        } else {
            format!("{path}:\n{diagnostics}")
        });
    }

    // Keep OXC's node store enabled because the IR checks the resolved
    // declaration kind for each `bind` reference.
    let semantic_return = SemanticBuilder::new()
        .with_build_nodes(true)
        .build(&parsed.program);
    if !semantic_return.diagnostics.is_empty() {
        let diagnostics = semantic_return
            .diagnostics
            .iter()
            .map(|diagnostic| diagnostic.to_string())
            .collect::<Vec<_>>()
            .join("\n");
        return Err(format!("{path}:\n{diagnostics}"));
    }
    let semantic = semantic_return.semantic;

    if env::args().any(|argument| argument == "--async-task-plan") {
        let mut collector = AsyncTaskPlanCollector {
            source_file: &path,
            semantic: &semantic,
            imported_async_task: false,
            invalid_import: false,
            tasks: Vec::new(),
            invalid_call: None,
        };
        collector.visit_program(&parsed.program);
        let plan = collector.into_plan()?;
        let json = serde_json::to_string_pretty(&plan).map_err(|error| error.to_string())?;
        if let Some(out_index) = env::args().position(|argument| argument == "--out") {
            let output = env::args().nth(out_index + 1)
                .ok_or_else(|| "--out requires a path".to_owned())?;
            fs::write(output, json).map_err(|error| error.to_string())?;
        } else {
            println!("{json}");
        }
        if let Some(emit_index) = env::args().position(|argument| argument == "--emit") {
            let output = env::args().nth(emit_index + 1)
                .ok_or_else(|| "--emit requires a path".to_owned())?;
            fs::write(output, generated_async_task_plan_module(&plan)?)
                .map_err(|error| error.to_string())?;
        }
        return Ok(());
    }

    let component_state_mode = env::args().any(|argument| argument == "--component-state-sites");
    let transform_component_state = env::args().any(|argument| argument == "--transform-component-state");
    if component_state_mode || transform_component_state {
        let mut collector = ComponentStateSiteCollector {
            source_file: &path,
            semantic: &semantic,
            component_stack: Vec::new(),
            components: BTreeMap::new(),
            hook_import: None,
            imported_hooks: BTreeSet::new(),
            unsupported_import_shape: false,
            unscoped_hook_calls: Vec::new(),
            unsupported_effect_arity: false,
        };
        collector.visit_program(&parsed.program);
        if collector.unsupported_import_shape {
            return Err("unsupported component-state import: useState/useEffect imports must be named, unaliased, and exclusive in one declaration".to_owned());
        }
        if transform_component_state && !collector.unscoped_hook_calls.is_empty() {
            return Err("unsupported transform: imported useState/useEffect calls must belong to named function components".to_owned());
        }
        if transform_component_state && collector.unsupported_effect_arity {
            return Err("unsupported transform: imported useEffect must have exactly one callback argument; dependency arrays are not supported".to_owned());
        }
        let plan = collector.into_plan();
        if plan.components.is_empty() {
            return Err("component state plan found no named function components".to_owned());
        }
        let json = serde_json::to_string_pretty(&plan).map_err(|error| error.to_string())?;
        if let Some(out_index) = env::args().position(|argument| argument == "--out") {
            let output = env::args()
                .nth(out_index + 1)
                .ok_or_else(|| "--out requires a path".to_owned())?;
            fs::write(output, json).map_err(|error| error.to_string())?;
        } else {
            println!("{json}");
        }
        if let Some(emit_index) = env::args().position(|argument| argument == "--emit") {
            let output = env::args()
                .nth(emit_index + 1)
                .ok_or_else(|| "--emit requires a path".to_owned())?;
            fs::write(output, generated_component_state_sites_module(&plan)?)
                .map_err(|error| error.to_string())?;
        }
        if transform_component_state {
            let runtime_import_index = env::args().position(|argument| argument == "--runtime-import")
                .ok_or_else(|| "--transform-component-state requires --runtime-import <path>".to_owned())?;
            let runtime_import = env::args().nth(runtime_import_index + 1)
                .ok_or_else(|| "--runtime-import requires a path".to_owned())?;
            let jsx_import_index = env::args().position(|argument| argument == "--jsx-import")
                .ok_or_else(|| "--transform-component-state requires --jsx-import <path>".to_owned())?;
            let jsx_import = env::args().nth(jsx_import_index + 1)
                .ok_or_else(|| "--jsx-import requires a path".to_owned())?;
            let transform_index = env::args().position(|argument| argument == "--emit-transform")
                .ok_or_else(|| "--transform-component-state requires --emit-transform <path>".to_owned())?;
            let transformed_path = env::args().nth(transform_index + 1)
                .ok_or_else(|| "--emit-transform requires a path".to_owned())?;
            let transformed = transform_component_state_source(&source, &plan, &runtime_import, &jsx_import)?;
            fs::write(transformed_path, transformed).map_err(|error| error.to_string())?;
        }
        return Ok(());
    }

    let mut collector = Collector {
        source: &source,
        semantic: &semantic,
        nodes: Vec::new(),
        calls: Vec::new(),
        maps: Vec::new(),
        filters: Vec::new(),
        unsupported_binding_attributes: Vec::new(),
    };
    collector.visit_program(&parsed.program);
    if !collector.unsupported_binding_attributes.is_empty() {
        return Err(
            "unsupported template: every style object property must be a direct bind() expression"
                .to_owned(),
        );
    }
    if env::args().any(|argument| argument == "--derived-keyed-regions") {
        let plan = compile_derived_keyed_regions(&collector, &path)?;
        let json = serde_json::to_string_pretty(&plan).map_err(|error| error.to_string())?;
        if let Some(out_index) = env::args().position(|argument| argument == "--out") {
            let output = env::args()
                .nth(out_index + 1)
                .ok_or_else(|| "--out requires a path".to_owned())?;
            fs::write(output, json).map_err(|error| error.to_string())?;
        } else {
            println!("{json}");
        }
        if let Some(emit_index) = env::args().position(|argument| argument == "--emit") {
            let output = env::args()
                .nth(emit_index + 1)
                .ok_or_else(|| "--emit requires a path".to_owned())?;
            fs::write(output, generated_derived_regions_module(&plan)?)
                .map_err(|error| error.to_string())?;
        }
        return Ok(());
    }
    if env::args().any(|argument| argument == "--derived-keyed-region") {
        let plan = compile_derived_keyed_region(&collector, &path)?.ok_or_else(|| {
            "unsupported derived region: expected a named filter result rendered by a keyed map"
                .to_owned()
        })?;
        let json = serde_json::to_string_pretty(&plan).map_err(|error| error.to_string())?;
        if let Some(out_index) = env::args().position(|argument| argument == "--out") {
            let output = env::args()
                .nth(out_index + 1)
                .ok_or_else(|| "--out requires a path".to_owned())?;
            fs::write(output, json).map_err(|error| error.to_string())?;
        } else {
            println!("{json}");
        }
        if let Some(emit_index) = env::args().position(|argument| argument == "--emit") {
            let output = env::args()
                .nth(emit_index + 1)
                .ok_or_else(|| "--emit requires a path".to_owned())?;
            fs::write(output, generated_derived_region_module(&plan)?)
                .map_err(|error| error.to_string())?;
        }
        return Ok(());
    }
    let used_call_spans: Vec<_> = collector
        .nodes
        .iter()
        .flat_map(|node| {
            node.bindings
                .iter()
                .map(|binding| (binding.span.start, binding.span.end))
        })
        .collect();
    let unsupported_bind_calls = collector
        .calls
        .iter()
        .filter(|call| {
            !call.callee_resolves_to_import
                || !used_call_spans.contains(&(call.span.start, call.span.end))
        })
        .map(|call| span(call.span.start, call.span.end))
        .collect();

    let repeated_host_plan = compile_repeated_host_plan(&collector)?;
    let ir = ProgramIr {
        schema_version: 5,
        frontend: "OXC TSX parser + semantic resolver; binding extraction prototype",
        source_file: path,
        host_nodes: collector.nodes,
        unsupported_bind_calls,
        repeated_host_plan: Some(repeated_host_plan),
    };
    let json = serde_json::to_string_pretty(&ir).map_err(|error| error.to_string())?;

    if let Some(out_index) = env::args().position(|arg| arg == "--out") {
        let output = env::args()
            .nth(out_index + 1)
            .ok_or_else(|| "--out requires a path".to_owned())?;
        fs::write(output, json).map_err(|error| error.to_string())?;
    } else {
        println!("{json}");
    }
    if let Some(emit_index) = env::args().position(|arg| arg == "--emit") {
        let output = env::args()
            .nth(emit_index + 1)
            .ok_or_else(|| "--emit requires a path".to_owned())?;
        fs::write(
            output,
            generated_module(ir.repeated_host_plan.as_ref().expect("plan was validated"))
                .map_err(|error| error.to_string())?,
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        process::exit(1);
    }
}
