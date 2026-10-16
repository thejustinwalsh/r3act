use std::{
    collections::{BTreeMap, BTreeSet},
    env, fs,
    io::{self, BufRead, Write},
    process,
};

use oxc_allocator::Allocator;
use oxc_ast::{
    AstKind,
    ast::{
        Argument, ArrayExpressionElement, BindingPattern, CallExpression, Expression,
        FormalParameters, Function, FunctionBody, ImportDeclaration, ImportDeclarationSpecifier,
        ImportOrExportKind, JSXAttributeItem, JSXAttributeName, JSXAttributeValue, JSXChild,
        JSXElement, JSXElementName, JSXExpression, ModuleExportName, PropertyKey, Statement,
        UnaryOperator, VariableDeclaration, VariableDeclarator,
    },
};
use oxc_ast_visit::{Visit, walk};
use oxc_parser::Parser;
use oxc_semantic::{ScopeFlags, Semantic, SemanticBuilder, SymbolId};
use oxc_span::{GetSpan, SourceType};
use serde::{Deserialize, Serialize};

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
    #[serde(skip)]
    runtime_import: Option<SourceSpan>,
    #[serde(skip)]
    runtime_module: Option<String>,
    #[serde(skip)]
    hook_module: Option<String>,
    #[serde(skip)]
    boundary_sites: Vec<BoundarySiteIr>,
    components: Vec<ComponentStateSiteIr>,
    invalidation_graph: ComponentStateInvalidationGraphIr,
}

#[derive(Clone, Debug)]
struct BoundarySiteIr {
    site_id: String,
    opening: SourceSpan,
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
    invalid_unsupported_read: bool,
    allowed_input_refs: BTreeSet<(u32, u32)>,
}

#[derive(Debug, Serialize)]
struct NativeModulePlan {
    schema_version: u32,
    source_file: String,
    helper_module: String,
    tasks: Vec<NativeTaskPlan>,
    task_order: Vec<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    component_module: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    components: Option<Vec<NativeComponentMetadata>>,
}

#[derive(Debug, Serialize)]
struct NativeComponentMetadata {
    name: String,
    component_site_id: String,
    prop_only_sites: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    state_layout: Option<NativeStateLayoutMetadata>,
    host_leaf_output: bool,
    state_sites: Vec<NativeStateSiteMetadata>,
    effect_sites: Vec<NativeEffectSiteMetadata>,
    store_sites: Vec<NativeStoreSiteMetadata>,
    #[serde(default)]
    collection_sites: Vec<NativeCollectionSiteMetadata>,
}

#[derive(Debug, Serialize)]
struct NativeStateLayoutMetadata {
    schema_version: u32,
    #[serde(rename = "programId", skip_serializing_if = "Option::is_none")]
    program_id: Option<String>,
    slots: Vec<NativeStateLayoutSlotMetadata>,
}

#[derive(Clone, Debug, Serialize)]
struct NativeStateLayoutSlotMetadata {
    site_id: String,
    slot: usize,
}

#[derive(Debug, Serialize)]
struct NativeStateSiteMetadata {
    site_id: String,
    initial_value: Option<String>,
}

#[derive(Debug, Serialize)]
struct NativeEffectSiteMetadata {
    site_id: String,
}

#[derive(Debug, Serialize)]
struct NativeStoreSiteMetadata {
    site_id: String,
    source_expression: String,
}

#[derive(Debug, Serialize)]
struct NativeCollectionSiteMetadata {
    site_id: String,
    source_expression: String,
    row_parameter: String,
    requires_owner_render: bool,
}

#[derive(Clone)]
struct NativeStateBinding {
    site_id: String,
    name: String,
    immutable: bool,
}

struct NativePropCandidate {
    span: SourceSpan,
    state_refs: BTreeSet<SymbolId>,
    other_refs: bool,
}

struct NativeStateUsageCollector<'s, 'a> {
    semantic: &'s Semantic<'a>,
    call_sites: BTreeMap<(u32, u32), String>,
    bindings: BTreeMap<SymbolId, NativeStateBinding>,
    setter_symbols: BTreeSet<SymbolId>,
    current_declaration_is_const: bool,
    candidates: Vec<NativePropCandidate>,
    intrinsic_opening: Vec<bool>,
    outside_state_reads: BTreeSet<String>,
    numeric_sites: BTreeSet<String>,
}

#[derive(Debug, Serialize)]
struct NativeTaskPlan {
    id: String,
    site_id: String,
    depends_on: Vec<String>,
    span: SourceSpan,
}

#[derive(Clone)]
struct NativeTaskEdit {
    start: u32,
    end: u32,
    replacement: String,
}

struct NativeTaskCollector<'s, 'a> {
    source_file: &'s str,
    helper_module: &'s str,
    source: &'s str,
    semantic: &'s Semantic<'a>,
    helper_import_seen: bool,
    helper_symbols: BTreeSet<SymbolId>,
    aliased_helper_symbols: BTreeSet<SymbolId>,
    wrong_module_symbols: BTreeSet<SymbolId>,
    allowed_helper_refs: BTreeSet<(u32, u32)>,
    module_task_calls: BTreeSet<(u32, u32)>,
    invalid_import: Option<(SourceSpan, String)>,
    invalid_call: Option<(SourceSpan, String)>,
    tasks: Vec<NativeTaskPlan>,
    edits: Vec<NativeTaskEdit>,
}

#[derive(Deserialize)]
struct NativeModuleRequest {
    id: String,
    path: String,
    source: String,
    helper_module: String,
    #[serde(default)]
    component_module: Option<String>,
}

#[derive(Serialize)]
struct NativeModuleResponse {
    id: String,
    code: String,
    plan: Option<NativeModulePlan>,
    edits: Vec<NativeModuleEdit>,
    #[serde(skip_serializing_if = "Option::is_none")]
    component_edits: Option<Vec<NativeModuleEdit>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
struct NativeModuleEdit {
    start: usize,
    end: usize,
    replacement: String,
}

fn async_task_input_symbol(parameters: &FormalParameters<'_>) -> Option<SymbolId> {
    let parameter = parameters.items.first()?;
    let BindingPattern::BindingIdentifier(identifier) = &parameter.pattern else {
        return None;
    };
    identifier.symbol_id.get()
}

impl<'a> Visit<'a> for AsyncTaskInputReadCollector<'_, 'a> {
    fn visit_identifier_reference(&mut self, node: &oxc_ast::ast::IdentifierReference<'a>) {
        let symbol_id = node.reference_id.get().and_then(|reference_id| {
            self.semantic
                .scoping()
                .get_reference(reference_id)
                .symbol_id()
        });
        if symbol_id == self.input_symbol
            && !self
                .allowed_input_refs
                .contains(&(node.span.start, node.span.end))
        {
            self.invalid_unsupported_read = true;
        }
    }

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
                    self.allowed_input_refs
                        .insert((identifier.span.start, identifier.span.end));
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
                return Err(format!(
                    "async task ID must be non-empty and cannot contain `:`: {}",
                    task.id
                ));
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
                    return Err(format!(
                        "duplicate dependency `{dependency}` in async task `{}`",
                        task.id
                    ));
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
                    format!(
                        "async task `{}` depends on unknown task `{dependency}`",
                        task.id
                    )
                })?;
                indegree[task_index] += 1;
                dependents[dependency_index].push(task_index);
            }
        }
        let mut ready = Vec::new();
        for (index, degree) in indegree.iter().enumerate() {
            if *degree == 0 {
                ready.push(index);
            }
        }
        let mut task_order = Vec::with_capacity(self.tasks.len());
        let mut cursor = 0;
        while cursor < ready.len() {
            let task = ready[cursor];
            cursor += 1;
            task_order.push(task);
            for dependent in &dependents[task] {
                indegree[*dependent] -= 1;
                if indegree[*dependent] == 0 {
                    ready.push(*dependent);
                }
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
    host_leaf_output: bool,
    state_sites: Vec<StateSiteIr>,
    effect_sites: Vec<EffectSiteIr>,
    store_sites: Vec<StoreSiteIr>,
    collection_sites: Vec<CollectionSiteIr>,
}

#[derive(Debug, Serialize)]
struct StateSiteIr {
    ordinal: usize,
    site_id: String,
    call: SourceSpan,
    callee: SourceSpan,
    argument_insert_at: u32,
}

#[derive(Debug, Serialize)]
struct EffectSiteIr {
    ordinal: usize,
    site_id: String,
    argument_count: usize,
    call: SourceSpan,
    callee: SourceSpan,
    argument_insert_at: u32,
}

#[derive(Debug, Serialize)]
struct StoreSiteIr {
    ordinal: usize,
    site_id: String,
    hook_name: String,
    source_expression: String,
    call: SourceSpan,
    callee: SourceSpan,
    argument_insert_at: u32,
}

#[derive(Debug, Serialize)]
struct CollectionSiteIr {
    ordinal: usize,
    site_id: String,
    source_expression: String,
    row_parameter: String,
    collection_symbol: SymbolId,
    receiver: SourceSpan,
    requires_owner_render: bool,
    callee: SourceSpan,
    call: SourceSpan,
}

struct PendingCollectionMap {
    component_name: String,
    symbol: SymbolId,
    source_expression: String,
    receiver: SourceSpan,
    callee: SourceSpan,
    call: SourceSpan,
    valid_callback: bool,
    row_parameter: Option<String>,
}

struct CollectionReferenceIr {
    symbol: SymbolId,
    span: SourceSpan,
}

struct CollectionAliasEdge {
    alias: SymbolId,
    source: SymbolId,
    source_span: SourceSpan,
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

fn is_jsx_expression_through_parentheses(expression: &Expression<'_>) -> bool {
    match expression {
        Expression::ParenthesizedExpression(parenthesized) => {
            is_jsx_expression_through_parentheses(&parenthesized.expression)
        }
        Expression::JSXElement(_) | Expression::JSXFragment(_) => true,
        _ => false,
    }
}

struct ComponentStateSiteCollector<'s, 'a> {
    source_file: &'s str,
    source: &'s str,
    semantic: &'s Semantic<'a>,
    host_leaf_facts: HostLeafFacts,
    component_stack: Vec<String>,
    components: BTreeMap<String, ComponentStateSiteIr>,
    hook_import: Option<SourceSpan>,
    runtime_import: Option<SourceSpan>,
    runtime_module: Option<String>,
    hook_module: Option<String>,
    imported_hooks: BTreeSet<String>,
    native_suspense_symbols: BTreeSet<SymbolId>,
    native_runtime_namespace_symbols: BTreeSet<SymbolId>,
    boundary_sites: Vec<BoundarySiteIr>,
    reserved_boundary_attributes: Vec<SourceSpan>,
    unsupported_qualified_suspense: Vec<SourceSpan>,
    collection_factory_symbols: BTreeSet<SymbolId>,
    keyed_collection_type_symbols: BTreeSet<SymbolId>,
    typed_keyed_collection_symbols: BTreeSet<SymbolId>,
    typed_keyed_collection_alias_symbols: BTreeSet<SymbolId>,
    keyed_collection_symbols: BTreeSet<SymbolId>,
    keyed_collection_alias_symbols: BTreeSet<SymbolId>,
    collection_alias_edges: Vec<CollectionAliasEdge>,
    unsupported_collection_factory_import: Option<SourceSpan>,
    unsupported_collection_maps: Vec<SourceSpan>,
    aliased_collection_maps: Vec<SourceSpan>,
    pending_collection_maps: Vec<PendingCollectionMap>,
    collection_references: Vec<CollectionReferenceIr>,
    event_handler_symbols: BTreeSet<SymbolId>,
    event_callback_spans: Vec<SourceSpan>,
    function_binding_spans: Vec<(SymbolId, SourceSpan)>,
    current_declaration_is_const: bool,
    unsupported_import_shape: bool,
    unscoped_hook_calls: Vec<SourceSpan>,
    unsupported_effect_arity: bool,
    unsupported_store_arity: bool,
    invalid_store_hook_name: Option<String>,
    function_depth: usize,
    loop_depth: usize,
    invalid_ownership_calls: Vec<SourceSpan>,
    nested_components: Vec<SourceSpan>,
    unsupported_component_forms: Vec<(SourceSpan, &'static str)>,
    arrow_component_stack: Vec<SourceSpan>,
}

#[derive(Default)]
struct HostLeafFacts {
    create_store_symbols: BTreeSet<SymbolId>,
    use_store_symbols: BTreeSet<SymbolId>,
    use_state_symbols: BTreeSet<SymbolId>,
    store_symbols: BTreeSet<SymbolId>,
    primitive_store_symbols: BTreeSet<SymbolId>,
}

struct HostLeafImportCollector {
    facts: HostLeafFacts,
}

impl<'a> Visit<'a> for HostLeafImportCollector {
    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        if is_native_runtime_module(node.source.value.as_str())
            && node.import_kind != ImportOrExportKind::Type
        {
            for specifier in node.specifiers.iter().flatten() {
                let ImportDeclarationSpecifier::ImportSpecifier(specifier) = specifier else {
                    continue;
                };
                if specifier.import_kind == ImportOrExportKind::Type {
                    continue;
                }
                let imported = match &specifier.imported {
                    ModuleExportName::IdentifierName(name) => name.name.as_str(),
                    ModuleExportName::StringLiteral(name) => name.value.as_str(),
                    ModuleExportName::IdentifierReference(name) => name.name.as_str(),
                };
                let Some(symbol) = specifier.local.symbol_id.get() else {
                    continue;
                };
                match imported {
                    "createStore" => {
                        self.facts.create_store_symbols.insert(symbol);
                    }
                    "use" | "useStore" => {
                        self.facts.use_store_symbols.insert(symbol);
                    }
                    "useState" => {
                        self.facts.use_state_symbols.insert(symbol);
                    }
                    _ => {}
                }
            }
        }
        walk::walk_import_declaration(self, node);
    }
}

struct HostLeafStoreCollector<'a> {
    semantic: &'a Semantic<'a>,
    create_store_symbols: &'a BTreeSet<SymbolId>,
    store_symbols: BTreeSet<SymbolId>,
    primitive_store_symbols: BTreeSet<SymbolId>,
    current_declaration_is_const: bool,
}

impl<'a> Visit<'a> for HostLeafStoreCollector<'a> {
    fn visit_variable_declaration(&mut self, node: &VariableDeclaration<'a>) {
        let previous = self.current_declaration_is_const;
        self.current_declaration_is_const =
            node.kind == oxc_ast::ast::VariableDeclarationKind::Const;
        walk::walk_variable_declaration(self, node);
        self.current_declaration_is_const = previous;
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if self.current_declaration_is_const
            && let BindingPattern::BindingIdentifier(identifier) = &node.id
            && let Some(symbol) = identifier.symbol_id.get()
            && let Some(Expression::CallExpression(call)) = &node.init
            && call.arguments.len() == 1
            && let Expression::Identifier(callee) = &call.callee
            && callee
                .reference_id
                .get()
                .and_then(|reference| self.semantic.scoping().get_reference(reference).symbol_id())
                .is_some_and(|symbol| self.create_store_symbols.contains(&symbol))
        {
            self.store_symbols.insert(symbol);
            if call
                .arguments
                .first()
                .and_then(Argument::as_expression)
                .is_some_and(|expression| {
                    is_primitive_expression(expression, self.semantic, &BTreeSet::new())
                })
            {
                self.primitive_store_symbols.insert(symbol);
            }
        }
        walk::walk_variable_declarator(self, node);
    }
}

fn collect_host_leaf_facts<'a>(
    program: &oxc_ast::ast::Program<'a>,
    semantic: &Semantic<'a>,
) -> HostLeafFacts {
    let mut imports = HostLeafImportCollector {
        facts: HostLeafFacts::default(),
    };
    imports.visit_program(program);
    let mut stores = HostLeafStoreCollector {
        semantic,
        create_store_symbols: &imports.facts.create_store_symbols,
        store_symbols: BTreeSet::new(),
        primitive_store_symbols: BTreeSet::new(),
        current_declaration_is_const: false,
    };
    stores.visit_program(program);
    HostLeafFacts {
        store_symbols: stores.store_symbols,
        primitive_store_symbols: stores.primitive_store_symbols,
        ..imports.facts
    }
}

fn reference_symbol<'a>(
    identifier: &oxc_ast::ast::IdentifierReference<'a>,
    semantic: &Semantic<'a>,
) -> Option<SymbolId> {
    identifier
        .reference_id
        .get()
        .and_then(|reference| semantic.scoping().get_reference(reference).symbol_id())
}

fn is_primitive_expression(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    primitive_symbols: &BTreeSet<SymbolId>,
) -> bool {
    match expression {
        Expression::StringLiteral(_)
        | Expression::NumericLiteral(_)
        | Expression::BooleanLiteral(_)
        | Expression::NullLiteral(_)
        | Expression::BigIntLiteral(_) => true,
        Expression::Identifier(identifier) => reference_symbol(identifier, semantic)
            .is_some_and(|symbol| primitive_symbols.contains(&symbol)),
        Expression::TemplateLiteral(template) => template
            .expressions
            .iter()
            .all(|expression| is_primitive_expression(expression, semantic, primitive_symbols)),
        Expression::UnaryExpression(unary) => {
            is_primitive_expression(&unary.argument, semantic, primitive_symbols)
        }
        Expression::BinaryExpression(binary) => {
            is_primitive_expression(&binary.left, semantic, primitive_symbols)
                && is_primitive_expression(&binary.right, semantic, primitive_symbols)
        }
        Expression::LogicalExpression(logical) => {
            is_primitive_expression(&logical.left, semantic, primitive_symbols)
                && is_primitive_expression(&logical.right, semantic, primitive_symbols)
        }
        Expression::ConditionalExpression(conditional) => {
            is_primitive_expression(&conditional.consequent, semantic, primitive_symbols)
                && is_primitive_expression(&conditional.alternate, semantic, primitive_symbols)
        }
        Expression::CallExpression(call) => {
            let Expression::Identifier(callee) = &call.callee else {
                return false;
            };
            callee.name == "String"
                && reference_symbol(callee, semantic).is_none()
                && call.arguments.len() == 1
                && call
                    .arguments
                    .first()
                    .and_then(Argument::as_expression)
                    .is_some_and(|argument| {
                        is_primitive_expression(argument, semantic, primitive_symbols)
                    })
        }
        _ => false,
    }
}

fn is_host_leaf_expression(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    primitive_symbols: &BTreeSet<SymbolId>,
) -> bool {
    match expression {
        Expression::JSXElement(element) => {
            is_host_leaf_element(element, semantic, primitive_symbols)
        }
        Expression::ConditionalExpression(conditional) => {
            is_host_leaf_expression(&conditional.consequent, semantic, primitive_symbols)
                && is_host_leaf_expression(&conditional.alternate, semantic, primitive_symbols)
        }
        Expression::LogicalExpression(logical) => {
            is_primitive_expression(&logical.left, semantic, primitive_symbols)
                && is_host_leaf_expression(&logical.right, semantic, primitive_symbols)
        }
        _ => is_primitive_expression(expression, semantic, primitive_symbols),
    }
}

fn is_host_leaf_element(
    element: &JSXElement<'_>,
    semantic: &Semantic<'_>,
    primitive_symbols: &BTreeSet<SymbolId>,
) -> bool {
    let JSXElementName::Identifier(tag) = &element.opening_element.name else {
        return false;
    };
    if !tag.name.chars().next().is_some_and(char::is_lowercase) && !tag.name.contains('-') {
        return false;
    }
    if element
        .opening_element
        .attributes
        .iter()
        .any(|attribute| match attribute {
            JSXAttributeItem::SpreadAttribute(_) => true,
            JSXAttributeItem::Attribute(attribute) => matches!(
                &attribute.name,
                JSXAttributeName::Identifier(name) if name.name == "children"
            ),
        })
    {
        return false;
    }
    element.children.iter().all(|child| match child {
        JSXChild::Text(_) => true,
        JSXChild::Element(child) => is_host_leaf_element(child, semantic, primitive_symbols),
        JSXChild::Fragment(_) | JSXChild::Spread(_) => false,
        JSXChild::ExpressionContainer(container) => container
            .expression
            .as_expression()
            .is_none_or(|expression| {
                is_host_leaf_expression(expression, semantic, primitive_symbols)
            }),
    })
}

#[derive(Clone, Debug, PartialEq, Eq)]
struct HostRootIdentity {
    tag: String,
    key: Option<String>,
}

fn host_root_identity(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    primitive_symbols: &BTreeSet<SymbolId>,
) -> Option<HostRootIdentity> {
    match expression {
        Expression::JSXElement(element)
            if is_host_leaf_element(element, semantic, primitive_symbols) =>
        {
            let JSXElementName::Identifier(tag) = &element.opening_element.name else {
                return None;
            };
            let mut key = None;
            for attribute in &element.opening_element.attributes {
                let JSXAttributeItem::Attribute(attribute) = attribute else {
                    continue;
                };
                if !matches!(
                    &attribute.name,
                    JSXAttributeName::Identifier(name) if name.name == "key"
                ) {
                    continue;
                }
                let value = match attribute.value.as_ref()? {
                    JSXAttributeValue::StringLiteral(value) => value.value.to_string(),
                    JSXAttributeValue::ExpressionContainer(container) => {
                        match container.expression.as_expression()? {
                            Expression::StringLiteral(value) => value.value.to_string(),
                            Expression::NumericLiteral(value) => value.value.to_string(),
                            _ => return None,
                        }
                    }
                    _ => return None,
                };
                key = Some(value);
            }
            Some(HostRootIdentity {
                tag: tag.name.to_string(),
                key,
            })
        }
        Expression::ConditionalExpression(conditional) => {
            let consequent =
                host_root_identity(&conditional.consequent, semantic, primitive_symbols)?;
            let alternate =
                host_root_identity(&conditional.alternate, semantic, primitive_symbols)?;
            (consequent == alternate).then_some(consequent)
        }
        _ => None,
    }
}

struct HostLeafOutputCollector<'a> {
    semantic: &'a Semantic<'a>,
    facts: &'a HostLeafFacts,
    primitive_symbols: BTreeSet<SymbolId>,
    current_declaration_is_const: bool,
    valid: bool,
    valid_store_reads: bool,
    root_identity: Option<HostRootIdentity>,
    return_count: usize,
}

impl<'a> Visit<'a> for HostLeafOutputCollector<'a> {
    fn visit_function(&mut self, _node: &Function<'a>, _flags: ScopeFlags) {
        // Returns inside callbacks and nested component functions belong to
        // their own outputs, not to the enclosing component.
    }

    fn visit_arrow_function_expression(
        &mut self,
        _node: &oxc_ast::ast::ArrowFunctionExpression<'a>,
    ) {
        // A callback's returns and reads are not part of this component's
        // render output or render-time store footprint.
    }

    fn visit_variable_declaration(&mut self, node: &VariableDeclaration<'a>) {
        let previous = self.current_declaration_is_const;
        self.current_declaration_is_const =
            node.kind == oxc_ast::ast::VariableDeclarationKind::Const;
        walk::walk_variable_declaration(self, node);
        self.current_declaration_is_const = previous;
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if self.current_declaration_is_const
            && let Some(initializer) = node.init.as_ref()
        {
            let primitive =
                is_primitive_expression(initializer, self.semantic, &self.primitive_symbols)
                    || is_primitive_store_read(initializer, self.semantic, self.facts)
                    || is_primitive_state_read(
                        initializer,
                        self.semantic,
                        self.facts,
                        &self.primitive_symbols,
                    );
            if primitive {
                match &node.id {
                    BindingPattern::BindingIdentifier(identifier) => {
                        if let Some(symbol) = identifier.symbol_id.get() {
                            self.primitive_symbols.insert(symbol);
                        }
                    }
                    BindingPattern::ArrayPattern(pattern) => {
                        if let Some(Some(BindingPattern::BindingIdentifier(identifier))) =
                            pattern.elements.first()
                            && let Some(symbol) = identifier.symbol_id.get()
                        {
                            self.primitive_symbols.insert(symbol);
                        }
                    }
                    _ => {}
                }
            }
        }
        walk::walk_variable_declarator(self, node);
    }

    fn visit_return_statement(&mut self, node: &oxc_ast::ast::ReturnStatement<'a>) {
        self.return_count += 1;
        let Some(expression) = node.argument.as_ref() else {
            self.valid = false;
            walk::walk_return_statement(self, node);
            return;
        };
        let Some(identity) = host_root_identity(expression, self.semantic, &self.primitive_symbols)
        else {
            self.valid = false;
            walk::walk_return_statement(self, node);
            return;
        };
        if let Some(previous) = &self.root_identity {
            if *previous != identity {
                self.valid = false;
            }
        } else {
            self.root_identity = Some(identity);
        }
        walk::walk_return_statement(self, node);
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let Expression::Identifier(callee) = &node.callee
            && reference_symbol(callee, self.semantic)
                .is_some_and(|symbol| self.facts.use_store_symbols.contains(&symbol))
            && !node
                .arguments
                .first()
                .and_then(Argument::as_expression)
                .is_some_and(|source| {
                    is_static_native_store_source(source, self.semantic, self.facts)
                })
        {
            self.valid_store_reads = false;
        }
        walk::walk_call_expression(self, node);
    }
}

fn is_static_native_store_source(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    facts: &HostLeafFacts,
) -> bool {
    match expression {
        Expression::Identifier(identifier) => reference_symbol(identifier, semantic)
            .is_some_and(|symbol| facts.store_symbols.contains(&symbol)),
        Expression::ConditionalExpression(conditional) => {
            is_static_native_store_source(&conditional.consequent, semantic, facts)
                && is_static_native_store_source(&conditional.alternate, semantic, facts)
        }
        Expression::LogicalExpression(logical) => {
            is_static_native_store_source(&logical.left, semantic, facts)
                && is_static_native_store_source(&logical.right, semantic, facts)
        }
        _ => false,
    }
}

fn is_primitive_store_read(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    facts: &HostLeafFacts,
) -> bool {
    let Expression::CallExpression(call) = expression else {
        return false;
    };
    let Expression::Identifier(callee) = &call.callee else {
        return false;
    };
    reference_symbol(callee, semantic)
        .is_some_and(|symbol| facts.use_store_symbols.contains(&symbol))
        && call.arguments.len() == 1
        && call
            .arguments
            .first()
            .and_then(Argument::as_expression)
            .is_some_and(|argument| is_static_primitive_store_source(argument, semantic, facts))
}

fn is_static_primitive_store_source(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    facts: &HostLeafFacts,
) -> bool {
    match expression {
        Expression::Identifier(identifier) => reference_symbol(identifier, semantic)
            .is_some_and(|symbol| facts.primitive_store_symbols.contains(&symbol)),
        Expression::ConditionalExpression(conditional) => {
            is_static_primitive_store_source(&conditional.consequent, semantic, facts)
                && is_static_primitive_store_source(&conditional.alternate, semantic, facts)
        }
        Expression::LogicalExpression(logical) => {
            is_static_primitive_store_source(&logical.left, semantic, facts)
                && is_static_primitive_store_source(&logical.right, semantic, facts)
        }
        _ => false,
    }
}

fn is_primitive_state_read(
    expression: &Expression<'_>,
    semantic: &Semantic<'_>,
    facts: &HostLeafFacts,
    primitive_symbols: &BTreeSet<SymbolId>,
) -> bool {
    let Expression::CallExpression(call) = expression else {
        return false;
    };
    let Expression::Identifier(callee) = &call.callee else {
        return false;
    };
    reference_symbol(callee, semantic)
        .is_some_and(|symbol| facts.use_state_symbols.contains(&symbol))
        && call.arguments.len() == 1
        && call
            .arguments
            .first()
            .and_then(Argument::as_expression)
            .is_some_and(|initial| is_primitive_expression(initial, semantic, primitive_symbols))
}

fn component_host_leaf_output(
    body: &FunctionBody<'_>,
    semantic: &Semantic<'_>,
    facts: &HostLeafFacts,
) -> bool {
    let mut collector = HostLeafOutputCollector {
        semantic,
        facts,
        primitive_symbols: BTreeSet::new(),
        current_declaration_is_const: false,
        valid: true,
        valid_store_reads: true,
        root_identity: None,
        return_count: 0,
    };
    walk::walk_function_body(&mut collector, body);
    collector.valid
        && collector.valid_store_reads
        && collector.return_count > 0
        && collector.root_identity.is_some()
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
            runtime_import: self.runtime_import,
            runtime_module: self.runtime_module,
            hook_module: self.hook_module,
            boundary_sites: self.boundary_sites,
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

impl<'a> Visit<'a> for NativeStateUsageCollector<'_, 'a> {
    fn visit_variable_declaration(&mut self, node: &VariableDeclaration<'a>) {
        let previous = self.current_declaration_is_const;
        self.current_declaration_is_const =
            node.kind == oxc_ast::ast::VariableDeclarationKind::Const;
        walk::walk_variable_declaration(self, node);
        self.current_declaration_is_const = previous;
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let Some(Expression::CallExpression(call)) = &node.init {
            if let Some(site_id) = self
                .call_sites
                .get(&(call.span.start, call.span.end))
                .cloned()
            {
                if call
                    .arguments
                    .first()
                    .and_then(Argument::as_expression)
                    .is_some_and(is_numeric_state_initializer)
                {
                    self.numeric_sites.insert(site_id.clone());
                }
                if let BindingPattern::ArrayPattern(pattern) = &node.id {
                    if let Some(Some(BindingPattern::BindingIdentifier(value))) =
                        pattern.elements.first()
                    {
                        if let Some(symbol_id) = value.symbol_id.get() {
                            self.bindings.insert(
                                symbol_id,
                                NativeStateBinding {
                                    site_id: site_id.clone(),
                                    name: value.name.to_string(),
                                    immutable: self.current_declaration_is_const,
                                },
                            );
                        }
                    }
                    if let Some(Some(BindingPattern::BindingIdentifier(setter))) =
                        pattern.elements.get(1)
                    {
                        if let Some(symbol_id) = setter.symbol_id.get() {
                            self.setter_symbols.insert(symbol_id);
                        }
                    }
                }
            }
        }
        walk::walk_variable_declarator(self, node);
    }

    fn visit_jsx_attribute(&mut self, node: &oxc_ast::ast::JSXAttribute<'a>) {
        let property_name = match &node.name {
            JSXAttributeName::Identifier(name) => name.name.as_str(),
            _ => "",
        };
        let supported_prop = self.intrinsic_opening.last().copied().unwrap_or(false)
            && !matches!(property_name, "key" | "ref" | "children");
        if supported_prop {
            if let Some(JSXAttributeValue::ExpressionContainer(container)) = &node.value {
                if let Some(expression) = container.expression.as_expression() {
                    let is_style = matches!(&node.name, JSXAttributeName::Identifier(name) if name.name == "style");
                    if is_style {
                        if let Expression::ObjectExpression(object) = expression {
                            for property in &object.properties {
                                if let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) =
                                    property
                                {
                                    if !property.computed && !property.method {
                                        self.candidates.push(NativePropCandidate {
                                            span: span(
                                                property.value.span().start,
                                                property.value.span().end,
                                            ),
                                            state_refs: BTreeSet::new(),
                                            other_refs: false,
                                        });
                                    }
                                }
                            }
                        }
                    } else {
                        self.candidates.push(NativePropCandidate {
                            span: span(expression.span().start, expression.span().end),
                            state_refs: BTreeSet::new(),
                            other_refs: false,
                        });
                    }
                }
            }
        }
        walk::walk_jsx_attribute(self, node);
    }

    fn visit_jsx_opening_element(&mut self, node: &oxc_ast::ast::JSXOpeningElement<'a>) {
        let intrinsic = match &node.name {
            JSXElementName::Identifier(name) => {
                name.name.chars().next().is_some_and(char::is_lowercase) || name.name.contains('-')
            }
            _ => false,
        };
        self.intrinsic_opening.push(intrinsic);
        walk::walk_jsx_opening_element(self, node);
        self.intrinsic_opening.pop();
    }

    fn visit_identifier_reference(&mut self, node: &oxc_ast::ast::IdentifierReference<'a>) {
        let symbol = node
            .reference_id
            .get()
            .and_then(|id| self.semantic.scoping().get_reference(id).symbol_id());
        if let Some(symbol) = symbol {
            if let Some(binding) = self.bindings.get(&symbol) {
                if let Some(candidate) = self.candidates.iter_mut().find(|candidate| {
                    candidate.span.start <= node.span.start && candidate.span.end >= node.span.end
                }) {
                    candidate.state_refs.insert(symbol);
                } else {
                    self.outside_state_reads.insert(binding.site_id.clone());
                }
            } else if !self.setter_symbols.contains(&symbol) {
                for candidate in &mut self.candidates {
                    if candidate.span.start <= node.span.start
                        && candidate.span.end >= node.span.end
                    {
                        candidate.other_refs = true;
                    }
                }
            }
        } else {
            for candidate in &mut self.candidates {
                if candidate.span.start <= node.span.start && candidate.span.end >= node.span.end {
                    candidate.other_refs = true;
                }
            }
        }
    }
}

fn is_numeric_state_initializer(expression: &Expression<'_>) -> bool {
    match expression {
        Expression::NumericLiteral(_) => true,
        Expression::UnaryExpression(unary) => {
            matches!(
                unary.operator,
                UnaryOperator::UnaryPlus | UnaryOperator::UnaryNegation
            ) && matches!(unary.argument, Expression::NumericLiteral(_))
        }
        _ => false,
    }
}

fn jsx_member_root_reference<'a>(
    object: &'a oxc_ast::ast::JSXMemberExpressionObject<'a>,
) -> Option<&'a oxc_ast::ast::IdentifierReference<'a>> {
    match object {
        oxc_ast::ast::JSXMemberExpressionObject::IdentifierReference(identifier) => {
            Some(identifier)
        }
        oxc_ast::ast::JSXMemberExpressionObject::MemberExpression(member) => {
            jsx_member_root_reference(&member.object)
        }
        oxc_ast::ast::JSXMemberExpressionObject::ThisExpression(_) => None,
    }
}

fn is_native_runtime_module(module: &str) -> bool {
    matches!(module, "@compiled-ui/runtime" | "@compiled-ui/runtime/core")
        || module.contains("native_runtime_api.ts")
        || module.ends_with("native_runtime_api.js")
}

struct KeyedCollectionTypeImportCollector {
    symbols: BTreeSet<SymbolId>,
}

impl<'a> Visit<'a> for KeyedCollectionTypeImportCollector {
    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        if !is_native_runtime_module(node.source.value.as_str()) {
            return;
        }
        for specifier in node.specifiers.iter().flatten() {
            let ImportDeclarationSpecifier::ImportSpecifier(specifier) = specifier else {
                continue;
            };
            let is_type_import = node.import_kind == ImportOrExportKind::Type
                || specifier.import_kind == ImportOrExportKind::Type;
            if !is_type_import
                || !matches!(
                    &specifier.imported,
                    ModuleExportName::IdentifierName(name) if name.name == "KeyedCollection"
                )
            {
                continue;
            }
            if let Some(symbol) = specifier.local.symbol_id.get() {
                self.symbols.insert(symbol);
            }
        }
    }
}

fn type_property_name<'a>(key: &PropertyKey<'a>) -> Option<&'a str> {
    match key {
        PropertyKey::StaticIdentifier(identifier) => Some(identifier.name.as_str()),
        _ => None,
    }
}

fn parameter_keyed_collection_symbol<'a>(
    params: &FormalParameters<'a>,
    semantic: &Semantic<'a>,
    imported_type_symbols: &BTreeSet<SymbolId>,
) -> Vec<SymbolId> {
    if params.items.len() != 1 || params.rest.is_some() {
        return Vec::new();
    }
    let parameter = &params.items[0];
    if parameter.optional || parameter.initializer.is_some() {
        return Vec::new();
    }
    let BindingPattern::ObjectPattern(bindings) = &parameter.pattern else {
        return Vec::new();
    };
    if bindings.rest.is_some() {
        return Vec::new();
    }
    let Some(annotation) = parameter.type_annotation.as_ref() else {
        return Vec::new();
    };
    let oxc_ast::ast::TSType::TSTypeLiteral(object_type) = &annotation.type_annotation else {
        return Vec::new();
    };

    let mut symbols = Vec::new();
    for binding in &bindings.properties {
        if binding.computed {
            continue;
        }
        let Some(prop_name) = type_property_name(&binding.key) else {
            continue;
        };
        let BindingPattern::BindingIdentifier(local) = &binding.value else {
            continue;
        };
        let Some(symbol) = local.symbol_id.get() else {
            continue;
        };
        let mut matching_signatures = object_type.members.iter().filter_map(|member| {
            let oxc_ast::ast::TSSignature::TSPropertySignature(signature) = member else {
                return None;
            };
            (type_property_name(&signature.key) == Some(prop_name)).then_some(signature)
        });
        let Some(signature) = matching_signatures.next() else {
            continue;
        };
        if matching_signatures.next().is_some() || signature.optional {
            continue;
        }
        let Some(type_annotation) = signature.type_annotation.as_ref() else {
            continue;
        };
        let oxc_ast::ast::TSType::TSTypeReference(type_reference) =
            &type_annotation.type_annotation
        else {
            continue;
        };
        if type_reference
            .type_arguments
            .as_ref()
            .is_none_or(|arguments| arguments.params.is_empty())
        {
            continue;
        }
        let oxc_ast::ast::TSTypeName::IdentifierReference(type_name) = &type_reference.type_name
        else {
            continue;
        };
        if reference_symbol(type_name, semantic)
            .is_some_and(|type_symbol| imported_type_symbols.contains(&type_symbol))
        {
            symbols.push(symbol);
        }
    }
    symbols
}

impl<'a> Visit<'a> for ComponentStateSiteCollector<'_, 'a> {
    fn visit_variable_declaration(&mut self, node: &VariableDeclaration<'a>) {
        let previous = self.current_declaration_is_const;
        self.current_declaration_is_const =
            node.kind == oxc_ast::ast::VariableDeclarationKind::Const;
        walk::walk_variable_declaration(self, node);
        self.current_declaration_is_const = previous;
    }

    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        let module = node.source.value.as_str();
        let is_native_runtime = is_native_runtime_module(module);
        if is_native_runtime && self.runtime_import.is_none() {
            self.runtime_import = Some(span(node.span.start, node.span.end));
            self.runtime_module = Some(module.to_owned());
        }
        if let Some(specifiers) = &node.specifiers {
            for specifier in specifiers {
                if is_native_runtime && node.import_kind != ImportOrExportKind::Type {
                    match specifier {
                        ImportDeclarationSpecifier::ImportSpecifier(specifier)
                            if specifier.import_kind != ImportOrExportKind::Type
                                && matches!(&specifier.imported, ModuleExportName::IdentifierName(name) if name.name == "Suspense") =>
                        {
                            if let Some(symbol) = specifier.local.symbol_id.get() {
                                self.native_suspense_symbols.insert(symbol);
                            }
                        }
                        ImportDeclarationSpecifier::ImportNamespaceSpecifier(specifier) => {
                            if let Some(symbol) = specifier.local.symbol_id.get() {
                                self.native_runtime_namespace_symbols.insert(symbol);
                            }
                        }
                        _ => {}
                    }
                }
                if let ImportDeclarationSpecifier::ImportSpecifier(specifier) = specifier {
                    if matches!(&specifier.imported, ModuleExportName::IdentifierName(name) if name.name == "createKeyedCollection")
                        && is_native_runtime
                    {
                        if specifier.local.name.as_str() != "createKeyedCollection" {
                            self.unsupported_collection_factory_import =
                                Some(span(specifier.span.start, specifier.span.end));
                        } else if specifier.import_kind != ImportOrExportKind::Type
                            && let Some(symbol) = specifier.local.symbol_id.get()
                        {
                            self.collection_factory_symbols.insert(symbol);
                        }
                    }
                }
            }
            let relevant = specifiers.iter().any(|specifier| match specifier {
                ImportDeclarationSpecifier::ImportSpecifier(specifier) => {
                    let local = specifier.local.name.as_str();
                    let imported = matches!(
                        &specifier.imported,
                        ModuleExportName::IdentifierName(name) if name.name == "useState" || name.name == "useEffect" || name.name == "useStore" || name.name == "use"
                    );
                    imported || local == "useState" || local == "useEffect" || local == "useStore" || local == "use"
                }
                _ => false,
            });
            if relevant {
                if node.import_kind == ImportOrExportKind::Type {
                    self.unsupported_import_shape = true;
                }
                let mut hooks = BTreeSet::new();
                let mut valid = true;
                for specifier in specifiers {
                    let ImportDeclarationSpecifier::ImportSpecifier(specifier) = specifier else {
                        // Native runtime modules may share the declaration with JSX/host helpers.
                        continue;
                    };
                    let imported_name = match &specifier.imported {
                        ModuleExportName::IdentifierName(name) => name.name.as_str(),
                        _ => "",
                    };
                    let local = specifier.local.name.as_str();
                    if imported_name != "useState"
                        && imported_name != "useEffect"
                        && imported_name != "useStore"
                        && imported_name != "use"
                        && local != "useState"
                        && local != "useEffect"
                        && local != "useStore"
                        && local != "use"
                    {
                        continue;
                    }
                    if specifier.import_kind == ImportOrExportKind::Type
                        || !matches!(imported_name, "useState" | "useEffect" | "useStore" | "use")
                        || local != imported_name
                        || !hooks.insert(imported_name.to_owned())
                    {
                        valid = false;
                    }
                }
                let module_matches = self
                    .hook_module
                    .as_deref()
                    .is_none_or(|hook_module| hook_module == module);
                let duplicate_hooks = hooks.iter().any(|hook| self.imported_hooks.contains(hook));
                if !valid || hooks.is_empty() || !module_matches || duplicate_hooks {
                    self.unsupported_import_shape = true;
                } else {
                    if self.hook_import.is_none() {
                        self.hook_import = Some(span(node.span.start, node.span.end));
                        self.hook_module = Some(module.to_owned());
                    }
                    self.imported_hooks.extend(hooks);
                }
            }
        }
        walk::walk_import_declaration(self, node);
    }

    fn visit_jsx_opening_element(&mut self, node: &oxc_ast::ast::JSXOpeningElement<'a>) {
        for attribute in &node.attributes {
            if let JSXAttributeItem::Attribute(attribute) = attribute
                && matches!(&attribute.name, JSXAttributeName::Identifier(identifier) if identifier.name == "__nativeBoundarySite")
            {
                self.reserved_boundary_attributes
                    .push(span(attribute.span.start, attribute.span.end));
            }
        }

        let imported_suspense = match &node.name {
            JSXElementName::IdentifierReference(identifier) => identifier
                .reference_id
                .get()
                .and_then(|reference| self.semantic.scoping().get_reference(reference).symbol_id())
                .is_some_and(|symbol| self.native_suspense_symbols.contains(&symbol)),
            _ => false,
        };
        if imported_suspense {
            let ordinal = self.boundary_sites.len();
            self.boundary_sites.push(BoundarySiteIr {
                site_id: format!("{}#boundary:{}", self.source_file, ordinal),
                opening: span(node.span.start, node.span.end),
            });
        } else if let JSXElementName::MemberExpression(member) = &node.name
            && member.property.name == "Suspense"
            && jsx_member_root_reference(&member.object)
                .and_then(|identifier| {
                    identifier.reference_id.get().and_then(|reference| {
                        self.semantic.scoping().get_reference(reference).symbol_id()
                    })
                })
                .is_some_and(|symbol| self.native_runtime_namespace_symbols.contains(&symbol))
        {
            self.unsupported_qualified_suspense
                .push(span(node.span.start, node.span.end));
        }
        walk::walk_jsx_opening_element(self, node);
    }

    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        if let Some(identifier) = node.id.as_ref()
            && (self.function_depth != 0
                || !identifier
                    .name
                    .as_str()
                    .chars()
                    .next()
                    .is_some_and(char::is_uppercase))
            && let Some(symbol) = identifier.symbol_id.get()
        {
            self.function_binding_spans
                .push((symbol, span(node.span.start, node.span.end)));
        }
        let component_name = node
            .id
            .as_ref()
            .map(|identifier| identifier.name.as_str().to_owned())
            .filter(|name| name.chars().next().is_some_and(char::is_uppercase));
        if let Some(name) = &component_name {
            for symbol in parameter_keyed_collection_symbol(
                &node.params,
                self.semantic,
                &self.keyed_collection_type_symbols,
            ) {
                self.keyed_collection_symbols.insert(symbol);
                self.typed_keyed_collection_symbols.insert(symbol);
            }
            if node.r#async {
                self.unsupported_component_forms
                    .push((span(node.span.start, node.span.end), "async"));
            }
            if self.function_depth != 0 {
                self.nested_components
                    .push(span(node.span.start, node.span.end));
            }
            let component_site_id = format!("{}#component:{}", self.source_file, name);
            let host_leaf_output = node.body.as_ref().is_some_and(|body| {
                component_host_leaf_output(body, self.semantic, &self.host_leaf_facts)
            });
            self.components
                .entry(name.clone())
                .or_insert_with(|| ComponentStateSiteIr {
                    name: name.clone(),
                    component_site_id,
                    declaration: span(node.span.start, node.span.end),
                    host_leaf_output,
                    state_sites: Vec::new(),
                    effect_sites: Vec::new(),
                    store_sites: Vec::new(),
                    collection_sites: Vec::new(),
                });
            self.component_stack.push(name.clone());
        }
        self.function_depth += 1;
        walk::walk_function(self, node, flags);
        self.function_depth -= 1;
        if component_name.is_some() {
            self.component_stack.pop();
        }
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let (Some(component_name), Expression::StaticMemberExpression(member)) =
            (self.component_stack.last(), &node.callee)
            && member.property.name == "map"
            && let Expression::Identifier(collection) = &member.object
        {
            let symbol = collection.reference_id.get().and_then(|reference_id| {
                self.semantic
                    .scoping()
                    .get_reference(reference_id)
                    .symbol_id()
            });
            if let Some(symbol) = symbol {
                let callback = node.arguments.first().and_then(|argument| match argument {
                    Argument::ArrowFunctionExpression(callback) => Some(callback),
                    _ => None,
                });
                let valid_callback = node.arguments.len() == 1
                    && callback.is_some_and(|callback| {
                        callback.params.items.len() == 1
                            && callback.params.rest.is_none()
                            && !callback.r#async
                            && callback
                                .body
                                .as_expression()
                                .is_some_and(|body| is_jsx_expression_through_parentheses(body))
                    });
                let row_parameter =
                    callback.and_then(|callback| match &callback.params.items.first()?.pattern {
                        BindingPattern::BindingIdentifier(row) => {
                            Some(row.name.as_str().to_owned())
                        }
                        _ => None,
                    });
                self.pending_collection_maps.push(PendingCollectionMap {
                    component_name: component_name.clone(),
                    symbol,
                    source_expression: self.source
                        [collection.span.start as usize..collection.span.end as usize]
                        .to_owned(),
                    receiver: span(collection.span.start, collection.span.end),
                    callee: span(member.span.start, member.span.end),
                    call: span(node.span.start, node.span.end),
                    valid_callback: valid_callback && row_parameter.is_some(),
                    row_parameter,
                });
            }
        }
        if let Expression::Identifier(identifier) = &node.callee {
            let imported_hook = self.imported_hooks.contains(identifier.name.as_str())
                && identifier
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
            if imported_hook {
                if self.function_depth != 1 || self.loop_depth != 0 {
                    self.invalid_ownership_calls
                        .push(span(node.span.start, node.span.end));
                }
                if let Some(component_name) = self.component_stack.last() {
                    if let Some(component) = self.components.get_mut(component_name) {
                        if identifier.name == "useState" {
                            let ordinal = component.state_sites.len();
                            component.state_sites.push(StateSiteIr {
                                ordinal,
                                site_id: format!(
                                    "{}#component:{}#state:{}",
                                    self.source_file, component_name, ordinal
                                ),
                                call: span(node.span.start, node.span.end),
                                callee: span(identifier.span.start, identifier.span.end),
                                argument_insert_at: node
                                    .arguments
                                    .first()
                                    .map(|argument| argument.span().start)
                                    .unwrap_or(node.span.end.saturating_sub(1)),
                            });
                        } else if identifier.name == "useEffect" {
                            let ordinal = component.effect_sites.len();
                            component.effect_sites.push(EffectSiteIr {
                                ordinal,
                                site_id: format!(
                                    "{}#component:{}#effect:{}",
                                    self.source_file, component_name, ordinal
                                ),
                                argument_count: node.arguments.len(),
                                call: span(node.span.start, node.span.end),
                                callee: span(identifier.span.start, identifier.span.end),
                                argument_insert_at: node
                                    .arguments
                                    .first()
                                    .map(|argument| argument.span().start)
                                    .unwrap_or(node.span.end.saturating_sub(1)),
                            });
                            if node.arguments.len() != 1 {
                                self.unsupported_effect_arity = true;
                            }
                        } else {
                            let ordinal = component.store_sites.len();
                            let source_expression = node
                                .arguments
                                .first()
                                .filter(|argument| argument.as_expression().is_some())
                                .map(|argument| {
                                    self.source[argument.span().start as usize
                                        ..argument.span().end as usize]
                                        .trim()
                                        .to_owned()
                                });
                            component.store_sites.push(StoreSiteIr {
                                ordinal,
                                site_id: format!(
                                    "{}#component:{}#store:{}",
                                    self.source_file, component_name, ordinal
                                ),
                                hook_name: identifier.name.to_string(),
                                source_expression: source_expression.unwrap_or_default(),
                                call: span(node.span.start, node.span.end),
                                callee: span(identifier.span.start, identifier.span.end),
                                argument_insert_at: node
                                    .arguments
                                    .first()
                                    .map(|argument| argument.span().start)
                                    .unwrap_or(node.span.end.saturating_sub(1)),
                            });
                            if node.arguments.len() != 1
                                || component
                                    .store_sites
                                    .last()
                                    .is_some_and(|store| store.source_expression.is_empty())
                            {
                                self.unsupported_store_arity = true;
                                self.invalid_store_hook_name = Some(identifier.name.to_string());
                            }
                        }
                    }
                } else {
                    if let Some(component_span) = self.arrow_component_stack.last() {
                        self.unsupported_component_forms
                            .push((component_span.clone(), "arrow"));
                    }
                    self.unscoped_hook_calls
                        .push(span(node.span.start, node.span.end));
                }
            }
        }
        walk::walk_call_expression(self, node);
    }

    fn visit_arrow_function_expression(
        &mut self,
        node: &oxc_ast::ast::ArrowFunctionExpression<'a>,
    ) {
        self.function_depth += 1;
        walk::walk_arrow_function_expression(self, node);
        self.function_depth -= 1;
    }

    fn visit_identifier_reference(&mut self, node: &oxc_ast::ast::IdentifierReference<'a>) {
        if !self.component_stack.is_empty()
            && let Some(symbol) = node.reference_id.get().and_then(|reference_id| {
                self.semantic
                    .scoping()
                    .get_reference(reference_id)
                    .symbol_id()
            })
        {
            self.collection_references.push(CollectionReferenceIr {
                symbol,
                span: span(node.span.start, node.span.end),
            });
        }
    }

    fn visit_jsx_attribute(&mut self, node: &oxc_ast::ast::JSXAttribute<'a>) {
        let event_attribute = match &node.name {
            JSXAttributeName::Identifier(identifier) => identifier.name.as_str().starts_with("on"),
            JSXAttributeName::NamespacedName(_) => false,
        };
        if event_attribute
            && let Some(JSXAttributeValue::ExpressionContainer(container)) = node.value.as_ref()
        {
            match &container.expression {
                JSXExpression::ArrowFunctionExpression(callback) => self
                    .event_callback_spans
                    .push(span(callback.span.start, callback.span.end)),
                JSXExpression::FunctionExpression(callback) => self
                    .event_callback_spans
                    .push(span(callback.span.start, callback.span.end)),
                JSXExpression::Identifier(identifier) => {
                    if let Some(symbol) = identifier.reference_id.get().and_then(|reference_id| {
                        self.semantic
                            .scoping()
                            .get_reference(reference_id)
                            .symbol_id()
                    }) {
                        self.event_handler_symbols.insert(symbol);
                    }
                }
                _ => {}
            }
        }
        walk::walk_jsx_attribute(self, node);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let BindingPattern::BindingIdentifier(identifier) = &node.id
            && let Some(symbol) = identifier.symbol_id.get()
            && let Some(initializer) = node.init.as_ref()
            && matches!(
                initializer,
                Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
            )
        {
            self.function_binding_spans.push((
                symbol,
                span(initializer.span().start, initializer.span().end),
            ));
        }
        if self.function_depth == 0
            && self.current_declaration_is_const
            && let BindingPattern::BindingIdentifier(identifier) = &node.id
            && let Some(symbol) = identifier.symbol_id.get()
            && let Some(Expression::CallExpression(call)) = &node.init
            && call.arguments.len() == 2
            && let Expression::Identifier(callee) = &call.callee
            && callee
                .reference_id
                .get()
                .and_then(|reference_id| {
                    self.semantic
                        .scoping()
                        .get_reference(reference_id)
                        .symbol_id()
                })
                .is_some_and(|factory_symbol| {
                    self.collection_factory_symbols.contains(&factory_symbol)
                })
        {
            self.keyed_collection_symbols.insert(symbol);
        }
        if self.current_declaration_is_const
            && let BindingPattern::BindingIdentifier(identifier) = &node.id
            && let Some(alias) = identifier.symbol_id.get()
            && let Some(Expression::Identifier(source_identifier)) = node.init.as_ref()
            && let Some(source_symbol) =
                source_identifier
                    .reference_id
                    .get()
                    .and_then(|reference_id| {
                        self.semantic
                            .scoping()
                            .get_reference(reference_id)
                            .symbol_id()
                    })
        {
            self.collection_alias_edges.push(CollectionAliasEdge {
                alias,
                source: source_symbol,
                source_span: span(source_identifier.span.start, source_identifier.span.end),
            });
        }
        let component_name = match &node.id {
            BindingPattern::BindingIdentifier(identifier)
                if identifier
                    .name
                    .as_str()
                    .chars()
                    .next()
                    .is_some_and(char::is_uppercase) =>
            {
                Some(identifier.name.as_str())
            }
            _ => None,
        };
        let is_arrow_component = component_name.is_some()
            && matches!(
                node.init.as_ref(),
                Some(Expression::ArrowFunctionExpression(_))
            );
        if is_arrow_component {
            self.arrow_component_stack
                .push(span(node.span.start, node.span.end));
        }
        walk::walk_variable_declarator(self, node);
        if is_arrow_component {
            self.arrow_component_stack.pop();
        }
    }

    fn visit_for_statement(&mut self, node: &oxc_ast::ast::ForStatement<'a>) {
        self.loop_depth += 1;
        walk::walk_for_statement(self, node);
        self.loop_depth -= 1;
    }

    fn visit_for_in_statement(&mut self, node: &oxc_ast::ast::ForInStatement<'a>) {
        self.loop_depth += 1;
        walk::walk_for_in_statement(self, node);
        self.loop_depth -= 1;
    }

    fn visit_for_of_statement(&mut self, node: &oxc_ast::ast::ForOfStatement<'a>) {
        self.loop_depth += 1;
        walk::walk_for_of_statement(self, node);
        self.loop_depth -= 1;
    }

    fn visit_while_statement(&mut self, node: &oxc_ast::ast::WhileStatement<'a>) {
        self.loop_depth += 1;
        walk::walk_while_statement(self, node);
        self.loop_depth -= 1;
    }

    fn visit_do_while_statement(&mut self, node: &oxc_ast::ast::DoWhileStatement<'a>) {
        self.loop_depth += 1;
        walk::walk_do_while_statement(self, node);
        self.loop_depth -= 1;
    }
}

impl<'a> Visit<'a> for AsyncTaskPlanCollector<'_, 'a> {
    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &node.specifiers {
            let task_specifiers = specifiers
                .iter()
                .filter_map(|specifier| match specifier {
                    ImportDeclarationSpecifier::ImportSpecifier(specifier) => {
                        let imported = matches!(
                            &specifier.imported,
                            ModuleExportName::IdentifierName(name) if name.name == "asyncTask"
                        );
                        (imported || specifier.local.name.as_str() == "asyncTask")
                            .then_some(specifier)
                    }
                    _ => None,
                })
                .collect::<Vec<_>>();
            if !task_specifiers.is_empty() {
                self.imported_async_task = true;
                if task_specifiers.len() != 1
                    || task_specifiers[0].local.name.as_str() != "asyncTask"
                    || !matches!(&task_specifiers[0].imported, ModuleExportName::IdentifierName(name) if name.name == "asyncTask")
                    || node.import_kind == ImportOrExportKind::Type
                    || task_specifiers[0].import_kind == ImportOrExportKind::Type
                {
                    self.invalid_import = true;
                }
            }
        }
        walk::walk_import_declaration(self, node);
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if let Expression::Identifier(identifier) = &node.callee {
            if identifier.name.as_str() == "asyncTask" {
                let resolves_to_import = identifier
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
                if resolves_to_import {
                    let parsed = (|| -> Result<(String, Vec<String>, Vec<String>), String> {
                        if node.arguments.len() != 2 && node.arguments.len() != 3 {
                            return Err("asyncTask expects an ID and callback, optionally preceded by a literal dependency array".to_owned());
                        }
                        let id = match &node.arguments[0] {
                            Argument::StringLiteral(literal) => literal.value.as_str().to_owned(),
                            _ => return Err("asyncTask ID must be a string literal".to_owned()),
                        };
                        let (dependency_argument, callback_argument) = if node.arguments.len() == 3
                        {
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
                                        _ => {
                                            return Err(
                                                "asyncTask dependencies must be string literals"
                                                    .to_owned(),
                                            );
                                        }
                                    }
                                }
                                dependencies
                            }
                            Some(_) => {
                                return Err(
                                    "asyncTask dependencies must be a literal array".to_owned()
                                );
                            }
                            None => Vec::new(),
                        };
                        let input_symbol = match callback_argument {
                            Argument::ArrowFunctionExpression(callback) => {
                                async_task_input_symbol(&callback.params)
                            }
                            Argument::FunctionExpression(callback) => {
                                async_task_input_symbol(&callback.params)
                            }
                            _ => {
                                return Err(
                                    "asyncTask implementation must be a function expression"
                                        .to_owned(),
                                );
                            }
                        };
                        let mut read_collector = AsyncTaskInputReadCollector {
                            semantic: self.semantic,
                            input_symbol,
                            read_keys: Vec::new(),
                            invalid_dynamic_read: false,
                            invalid_unsupported_read: false,
                            allowed_input_refs: BTreeSet::new(),
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
                            return Err(
                                "asyncTask input reads must use literal Map.get keys".to_owned()
                            );
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

impl<'a> NativeTaskCollector<'_, 'a> {
    fn error_at(&mut self, at: SourceSpan, message: String) {
        self.invalid_call.get_or_insert((at, message));
    }

    fn finish(mut self) -> Result<(String, NativeModulePlan, Vec<NativeTaskEdit>), String> {
        if let Some((at, message)) = self.invalid_import {
            return Err(format_source_error(
                self.source_file,
                self.source,
                at.start,
                &message,
            ));
        }
        if let Some((at, message)) = self.invalid_call {
            return Err(format_source_error(
                self.source_file,
                self.source,
                at.start,
                &message,
            ));
        }
        if !self.helper_import_seen {
            return Err(format!(
                "{}:1:1: expected named `asyncTask` import from `{}`",
                self.source_file, self.helper_module
            ));
        }
        if self.tasks.is_empty() {
            return Err(format!(
                "{}:1:1: no `asyncTask` declarations found",
                self.source_file
            ));
        }

        let index_by_id: BTreeMap<_, _> = self
            .tasks
            .iter()
            .enumerate()
            .map(|(index, task)| (task.id.clone(), index))
            .collect();
        for task in &self.tasks {
            for dependency in &task.depends_on {
                if let Some(input) = dependency.strip_prefix('$') {
                    if input.is_empty() {
                        return Err(format_source_error(
                            self.source_file,
                            self.source,
                            task.span.start,
                            "external input names must contain at least one character",
                        ));
                    }
                } else if !index_by_id.contains_key(dependency) {
                    return Err(format_source_error(
                        self.source_file,
                        self.source,
                        task.span.start,
                        &format!(
                            "task `{}` reads undeclared task `{dependency}`; declare a task with that ID or prefix an external input with `$`",
                            task.id
                        ),
                    ));
                }
            }
        }

        let mut indegree = vec![0usize; self.tasks.len()];
        let mut dependents = vec![Vec::new(); self.tasks.len()];
        for (task_index, task) in self.tasks.iter().enumerate() {
            for dependency in &task.depends_on {
                if let Some(dependency_index) = index_by_id.get(dependency) {
                    indegree[task_index] += 1;
                    dependents[*dependency_index].push(task_index);
                }
            }
        }
        let mut ready = Vec::new();
        for (index, degree) in indegree.iter().enumerate() {
            if *degree == 0 {
                ready.push(index);
            }
        }
        let mut task_order = Vec::with_capacity(self.tasks.len());
        let mut cursor = 0;
        while cursor < ready.len() {
            let task_index = ready[cursor];
            cursor += 1;
            task_order.push(task_index);
            for dependent in &dependents[task_index] {
                indegree[*dependent] -= 1;
                if indegree[*dependent] == 0 {
                    ready.push(*dependent);
                }
            }
        }
        if task_order.len() != self.tasks.len() {
            let at = self
                .tasks
                .iter()
                .find(|task| indegree[index_by_id[&task.id]] > 0)
                .map(|task| task.span.start)
                .unwrap_or(0);
            return Err(format_source_error(
                self.source_file,
                self.source,
                at,
                "async task dependency cycle",
            ));
        }

        self.edits.sort_by_key(|edit| edit.start);
        let mut transformed = String::with_capacity(self.source.len() + self.edits.len() * 16);
        let mut cursor = 0usize;
        for edit in &self.edits {
            let start = edit.start as usize;
            let end = edit.end as usize;
            if start < cursor
                || end > self.source.len()
                || !self.source.is_char_boundary(start)
                || !self.source.is_char_boundary(end)
            {
                return Err(format!(
                    "{}: invalid compiler edit span {}..{}",
                    self.source_file, start, end
                ));
            }
            transformed.push_str(&self.source[cursor..start]);
            transformed.push_str(&edit.replacement);
            cursor = end;
        }
        transformed.push_str(&self.source[cursor..]);
        let plan = NativeModulePlan {
            schema_version: 1,
            source_file: self.source_file.to_owned(),
            helper_module: self.helper_module.to_owned(),
            tasks: self.tasks,
            task_order,
            component_module: None,
            components: None,
        };
        Ok((transformed, plan, self.edits))
    }
}

impl<'a> Visit<'a> for NativeTaskCollector<'_, 'a> {
    fn visit_program(&mut self, node: &oxc_ast::ast::Program<'a>) {
        for statement in &node.body {
            match statement {
                Statement::VariableDeclaration(declaration) => {
                    self.collect_module_task_initializers(declaration)
                }
                Statement::ExportDeclaration(export) => {
                    if let oxc_ast::ast::Declaration::VariableDeclaration(declaration) =
                        &export.declaration
                    {
                        self.collect_module_task_initializers(declaration);
                    }
                }
                _ => {}
            }
        }
        walk::walk_program(self, node);
    }

    fn visit_import_declaration(&mut self, node: &ImportDeclaration<'a>) {
        let source_module = node.source.value.as_str();
        // Accept the public asyncTask re-export so native files need not import the
        // compiler implementation module.
        let from_helper =
            source_module == self.helper_module || is_native_runtime_module(source_module);
        if let Some(specifiers) = &node.specifiers {
            for specifier in specifiers {
                let ImportDeclarationSpecifier::ImportSpecifier(named) = specifier else {
                    continue;
                };
                let imported_name = match &named.imported {
                    ModuleExportName::IdentifierName(name) => name.name.as_str(),
                    _ => continue,
                };
                if imported_name != "asyncTask" {
                    continue;
                }
                let Some(symbol_id) = named.local.symbol_id.get() else {
                    continue;
                };
                if from_helper {
                    self.helper_import_seen = true;
                    if node.import_kind == ImportOrExportKind::Type {
                        self.invalid_import.get_or_insert((
                            span(node.span.start, node.span.end),
                            "`asyncTask` must be imported as a runtime value; `import type` is unsupported".to_owned(),
                        ));
                    } else if named.import_kind == ImportOrExportKind::Type {
                        self.invalid_import.get_or_insert((
                            span(named.span.start, named.span.end),
                            "`asyncTask` must be imported as a runtime value; type-only specifiers are unsupported".to_owned(),
                        ));
                    }
                    if named.local.name.as_str() == "asyncTask" {
                        self.helper_symbols.insert(symbol_id);
                    } else {
                        self.aliased_helper_symbols.insert(symbol_id);
                        self.invalid_import.get_or_insert((
                            span(named.span.start, named.span.end),
                            "aliased `asyncTask` imports are unsupported; import the helper without an alias".to_owned(),
                        ));
                    }
                } else {
                    self.wrong_module_symbols.insert(symbol_id);
                }
            }
        }
        walk::walk_import_declaration(self, node);
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        let Expression::Identifier(identifier) = &node.callee else {
            walk::walk_call_expression(self, node);
            return;
        };
        let Some(symbol_id) = identifier.reference_id.get().and_then(|reference_id| {
            self.semantic
                .scoping()
                .get_reference(reference_id)
                .symbol_id()
        }) else {
            walk::walk_call_expression(self, node);
            return;
        };
        if self.helper_symbols.contains(&symbol_id)
            || self.aliased_helper_symbols.contains(&symbol_id)
            || self.wrong_module_symbols.contains(&symbol_id)
        {
            self.allowed_helper_refs
                .insert((identifier.span.start, identifier.span.end));
        }
        if self.aliased_helper_symbols.contains(&symbol_id) {
            self.error_at(
                span(node.span.start, node.span.end),
                "aliased `asyncTask` calls are unsupported".to_owned(),
            );
            walk::walk_call_expression(self, node);
            return;
        }
        if self.wrong_module_symbols.contains(&symbol_id) {
            self.error_at(
                span(node.span.start, node.span.end),
                format!("`asyncTask` must be imported from `{}`", self.helper_module),
            );
            walk::walk_call_expression(self, node);
            return;
        }
        if !self.helper_symbols.contains(&symbol_id) {
            walk::walk_call_expression(self, node);
            return;
        }
        if !self
            .module_task_calls
            .contains(&(node.span.start, node.span.end))
        {
            self.error_at(span(node.span.start, node.span.end), "`asyncTask` must be a direct top-level variable initializer or direct element of a top-level array initializer".to_owned());
            walk::walk_call_expression(self, node);
            return;
        }
        if self
            .tasks
            .iter()
            .any(|task| node.span.start > task.span.start && node.span.end < task.span.end)
        {
            self.error_at(span(node.span.start, node.span.end), "nested `asyncTask` declarations are unsupported; declare each task at module scope".to_owned());
            walk::walk_call_expression(self, node);
            return;
        }

        let parsed = (|| -> Result<(String, Vec<String>, NativeTaskEdit), String> {
            if node.arguments.len() != 2 && node.arguments.len() != 3 {
                return Err("`asyncTask` expects an ID and callback, optionally preceded by a literal dependency array".to_owned());
            }
            let (id_argument, dependencies_argument, callback_argument) =
                if node.arguments.len() == 2 {
                    (&node.arguments[0], None, &node.arguments[1])
                } else {
                    (
                        &node.arguments[0],
                        Some(&node.arguments[1]),
                        &node.arguments[2],
                    )
                };
            let id = match id_argument {
                Argument::StringLiteral(literal) if !literal.value.trim().is_empty() => {
                    literal.value.as_str().to_owned()
                }
                Argument::StringLiteral(_) => return Err("task ID must not be empty".to_owned()),
                _ => return Err("task ID must be a string literal".to_owned()),
            };
            if id.contains(':') {
                return Err("task IDs cannot contain `:`".to_owned());
            }
            if id.starts_with('$') {
                return Err(
                    "task IDs cannot start with `$`; that prefix is reserved for external inputs"
                        .to_owned(),
                );
            }
            let mut dependencies = match dependencies_argument {
                Some(Argument::ArrayExpression(array)) => {
                    let mut values = Vec::new();
                    for element in &array.elements {
                        match element {
                            ArrayExpressionElement::StringLiteral(literal) => {
                                values.push(literal.value.as_str().to_owned())
                            }
                            _ => {
                                return Err(
                                    "explicit task dependencies must be literal strings".to_owned()
                                );
                            }
                        }
                    }
                    values
                }
                Some(_) => {
                    return Err("explicit task dependencies must be a literal array".to_owned());
                }
                None => Vec::new(),
            };
            let (input_symbol, callback_span) = match callback_argument {
                Argument::ArrowFunctionExpression(callback) => (
                    async_task_input_symbol(&callback.params),
                    span(callback.span.start, callback.span.end),
                ),
                Argument::FunctionExpression(callback) => (
                    async_task_input_symbol(&callback.params),
                    span(callback.span.start, callback.span.end),
                ),
                _ => {
                    return Err(
                        "task callback must be an inline arrow or function expression".to_owned(),
                    );
                }
            };
            if input_symbol.is_none() {
                return Err("task callback must take one simple identifier parameter so its `.get()` reads can be analyzed".to_owned());
            }
            let mut reads = AsyncTaskInputReadCollector {
                semantic: self.semantic,
                input_symbol,
                read_keys: Vec::new(),
                invalid_dynamic_read: false,
                invalid_unsupported_read: false,
                allowed_input_refs: BTreeSet::new(),
            };
            match callback_argument {
                Argument::ArrowFunctionExpression(callback) => {
                    reads.visit_arrow_function_expression(callback)
                }
                Argument::FunctionExpression(callback) => {
                    reads.visit_function(callback, ScopeFlags::Function)
                }
                _ => unreachable!(),
            }
            if reads.invalid_dynamic_read {
                return Err("task input reads must use literal `.get(\"task-id\")` or `.get(\"$external\")`".to_owned());
            }
            if reads.invalid_unsupported_read {
                return Err("task input may only be read directly through literal `.get()` calls; aliasing, destructuring, and other property reads are unsupported".to_owned());
            }
            dependencies.extend(reads.read_keys);
            dependencies.sort();
            dependencies.dedup();
            let json_dependencies =
                serde_json::to_string(&dependencies).unwrap_or_else(|_| "[]".to_owned());
            let edit = if let Some(dependency_argument) = dependencies_argument {
                let dependency_span = span(
                    dependency_argument.span().start,
                    dependency_argument.span().end,
                );
                NativeTaskEdit {
                    start: dependency_span.start,
                    end: dependency_span.end,
                    replacement: json_dependencies,
                }
            } else {
                NativeTaskEdit {
                    start: callback_span.start,
                    end: callback_span.start,
                    replacement: format!("{json_dependencies}, "),
                }
            };
            Ok((id, dependencies, edit))
        })();

        match parsed {
            Ok((id, dependencies, edit)) => {
                let at = span(node.span.start, node.span.end);
                if self.tasks.iter().any(|task| task.id == id) {
                    self.error_at(at, format!("duplicate task ID `{id}`"));
                } else {
                    let site_id = format!("{}#async-task:{}", self.source_file, id);
                    self.edits.push(edit);
                    self.tasks.push(NativeTaskPlan {
                        id,
                        site_id,
                        depends_on: dependencies,
                        span: at,
                    });
                }
            }
            Err(message) => self.error_at(span(node.span.start, node.span.end), message),
        }
        walk::walk_call_expression(self, node);
    }

    fn visit_identifier_reference(&mut self, node: &oxc_ast::ast::IdentifierReference<'a>) {
        let Some(symbol_id) = node.reference_id.get().and_then(|reference_id| {
            self.semantic
                .scoping()
                .get_reference(reference_id)
                .symbol_id()
        }) else {
            return;
        };
        if (self.helper_symbols.contains(&symbol_id)
            || self.aliased_helper_symbols.contains(&symbol_id)
            || self.wrong_module_symbols.contains(&symbol_id))
            && !self
                .allowed_helper_refs
                .contains(&(node.span.start, node.span.end))
        {
            self.error_at(
                span(node.span.start, node.span.end),
                "the imported `asyncTask` helper may only be used as a direct top-level task call"
                    .to_owned(),
            );
        }
    }
}

impl NativeTaskCollector<'_, '_> {
    fn collect_module_task_initializers(&mut self, declaration: &VariableDeclaration<'_>) {
        for declarator in &declaration.declarations {
            if let Some(Expression::CallExpression(call)) = &declarator.init {
                self.module_task_calls
                    .insert((call.span.start, call.span.end));
            } else if let Some(array) = declarator.init.as_ref().and_then(task_array_initializer) {
                for element in &array.elements {
                    if let Some(Expression::CallExpression(call)) = element.as_expression() {
                        self.module_task_calls
                            .insert((call.span.start, call.span.end));
                    }
                }
            }
        }
    }
}

/// Peel only TypeScript's non-runtime-affecting expression wrappers. Calls
/// still have to be direct elements of this top-level array initializer.
fn task_array_initializer<'a, 'b>(
    expression: &'b Expression<'a>,
) -> Option<&'b oxc_ast::ast::ArrayExpression<'a>> {
    match expression {
        Expression::ArrayExpression(array) => Some(array),
        Expression::TSAsExpression(assertion) => task_array_initializer(&assertion.expression),
        Expression::TSSatisfiesExpression(satisfies) => {
            task_array_initializer(&satisfies.expression)
        }
        _ => None,
    }
}

fn format_source_error(path: &str, source: &str, offset: u32, message: &str) -> String {
    let offset = (offset as usize).min(source.len());
    let safe_offset = (0..=offset)
        .rev()
        .find(|candidate| source.is_char_boundary(*candidate))
        .unwrap_or(0);
    let prefix = &source[..safe_offset];
    let line = prefix.bytes().filter(|byte| *byte == b'\n').count() + 1;
    let column = prefix.rsplit('\n').next().unwrap_or("").chars().count() + 1;
    format!("{path}:{line}:{column}: {message}")
}

fn byte_offset_to_utf16(source: &str, offset: u32) -> usize {
    let offset = (offset as usize).min(source.len());
    let safe_offset = (0..=offset)
        .rev()
        .find(|candidate| source.is_char_boundary(*candidate))
        .unwrap_or(0);
    source[..safe_offset].encode_utf16().count()
}

fn compile_native_module(request: NativeModuleRequest) -> NativeModuleResponse {
    let id = request.id.clone();
    let fail = |error: String| NativeModuleResponse {
        id: id.clone(),
        code: String::new(),
        plan: None,
        edits: Vec::new(),
        component_edits: None,
        error: Some(error),
    };
    if !request.helper_module.is_empty() {
        let source_type = match SourceType::from_path(&request.path) {
            Ok(source_type) => source_type,
            Err(_) => {
                return fail(format!(
                    "{}:1:1: unsupported source extension",
                    request.path
                ));
            }
        };
        let allocator = Allocator::default();
        let parsed = Parser::new(&allocator, &request.source, source_type).parse();
        if !parsed.diagnostics.is_empty() || parsed.fatal_error {
            let error = parsed
                .diagnostics
                .iter()
                .map(|diagnostic| diagnostic.to_string())
                .collect::<Vec<_>>()
                .join("\n");
            let location = parsed
                .diagnostics
                .first()
                .map(|diagnostic| {
                    diagnostic
                        .labels
                        .first()
                        .map(|label| label.span().start)
                        .unwrap_or(0)
                })
                .unwrap_or(0);
            return fail(format_source_error(
                &request.path,
                &request.source,
                location,
                if error.is_empty() {
                    "OXC parser could not recover"
                } else {
                    &error
                },
            ));
        }
        let semantic_return = SemanticBuilder::new()
            .with_build_nodes(true)
            .build(&parsed.program);
        if !semantic_return.diagnostics.is_empty() {
            let diagnostic = semantic_return
                .diagnostics
                .first()
                .map(ToString::to_string)
                .unwrap_or_else(|| "semantic analysis failed".to_owned());
            let location = semantic_return
                .diagnostics
                .first()
                .map(|diagnostic| {
                    diagnostic
                        .labels
                        .first()
                        .map(|label| label.span().start)
                        .unwrap_or(0)
                })
                .unwrap_or(0);
            return fail(format_source_error(
                &request.path,
                &request.source,
                location,
                &diagnostic,
            ));
        }
        let semantic = semantic_return.semantic;
        let mut collector = NativeTaskCollector {
            source_file: &request.path,
            helper_module: &request.helper_module,
            source: &request.source,
            semantic: &semantic,
            helper_import_seen: false,
            helper_symbols: BTreeSet::new(),
            aliased_helper_symbols: BTreeSet::new(),
            wrong_module_symbols: BTreeSet::new(),
            allowed_helper_refs: BTreeSet::new(),
            module_task_calls: BTreeSet::new(),
            invalid_import: None,
            invalid_call: None,
            tasks: Vec::new(),
            edits: Vec::new(),
        };
        collector.visit_program(&parsed.program);
        let (code, mut plan, edits) = match collector.finish() {
            Ok(result) => result,
            Err(error) => return fail(error),
        };
        let edits = edits
            .into_iter()
            .map(|edit| NativeModuleEdit {
                start: byte_offset_to_utf16(&request.source, edit.start),
                end: byte_offset_to_utf16(&request.source, edit.end),
                replacement: edit.replacement,
            })
            .collect();
        if let Some(component_source) = request.component_module {
            match compile_native_component_module(&request.path, &component_source) {
                Ok((transformed, components, component_edits)) => {
                    plan.schema_version = 2;
                    plan.component_module = Some(transformed);
                    plan.components = Some(components);
                    return NativeModuleResponse {
                        id,
                        code,
                        plan: Some(plan),
                        edits,
                        component_edits: Some(component_edits),
                        error: None,
                    };
                }
                Err(error) => return fail(error),
            }
        }
        return NativeModuleResponse {
            id,
            code,
            plan: Some(plan),
            edits,
            component_edits: None,
            error: None,
        };
    }

    // A state-only source does not need an async-task helper module or task declarations.
    if request
        .component_module
        .as_deref()
        .unwrap_or(&request.source)
        .trim()
        .is_empty()
    {
        return fail(format!(
            "{}:1:1: expected a native component module",
            request.path
        ));
    }
    let mut plan = NativeModulePlan {
        schema_version: 2,
        source_file: request.path.clone(),
        helper_module: String::new(),
        tasks: Vec::new(),
        task_order: Vec::new(),
        component_module: None,
        components: None,
    };
    let component_source = request.component_module.unwrap_or(request.source);
    match compile_native_component_module(&request.path, &component_source) {
        Ok((transformed, components, component_edits)) => {
            plan.component_module = Some(transformed);
            plan.components = Some(components);
            NativeModuleResponse {
                id,
                code: String::new(),
                plan: Some(plan),
                edits: Vec::new(),
                component_edits: Some(component_edits),
                error: None,
            }
        }
        Err(error) => fail(error),
    }
}

/*
 * Native component lowering intentionally uses source-span edits. OXC remains the parser and
 * symbol resolver; Vite performs TypeScript and JSX lowering after this narrow transform.
 */
fn compile_native_component_module(
    path: &str,
    source: &str,
) -> Result<(String, Vec<NativeComponentMetadata>, Vec<NativeModuleEdit>), String> {
    let source_type = SourceType::tsx();
    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, source, source_type).parse();
    if !parsed.diagnostics.is_empty() || parsed.fatal_error {
        let error = parsed
            .diagnostics
            .iter()
            .map(|diagnostic| diagnostic.to_string())
            .collect::<Vec<_>>()
            .join("\n");
        let location = parsed
            .diagnostics
            .first()
            .map(|diagnostic| {
                diagnostic
                    .labels
                    .first()
                    .map(|label| label.span().start)
                    .unwrap_or(0)
            })
            .unwrap_or(0);
        return Err(format_source_error(
            path,
            source,
            location,
            if error.is_empty() {
                "OXC parser could not recover"
            } else {
                &error
            },
        ));
    }
    let semantic_return = SemanticBuilder::new()
        .with_build_nodes(true)
        .build(&parsed.program);
    if !semantic_return.diagnostics.is_empty() {
        let diagnostic = semantic_return
            .diagnostics
            .first()
            .map(ToString::to_string)
            .unwrap_or_else(|| "semantic analysis failed".to_owned());
        let location = semantic_return
            .diagnostics
            .first()
            .map(|diagnostic| {
                diagnostic
                    .labels
                    .first()
                    .map(|label| label.span().start)
                    .unwrap_or(0)
            })
            .unwrap_or(0);
        return Err(format_source_error(path, source, location, &diagnostic));
    }
    let semantic = semantic_return.semantic;
    let host_leaf_facts = collect_host_leaf_facts(&parsed.program, &semantic);
    let mut keyed_collection_type_imports = KeyedCollectionTypeImportCollector {
        symbols: BTreeSet::new(),
    };
    keyed_collection_type_imports.visit_program(&parsed.program);
    let mut collector = ComponentStateSiteCollector {
        source_file: path,
        source,
        semantic: &semantic,
        host_leaf_facts,
        component_stack: Vec::new(),
        components: BTreeMap::new(),
        hook_import: None,
        runtime_import: None,
        runtime_module: None,
        hook_module: None,
        imported_hooks: BTreeSet::new(),
        native_suspense_symbols: BTreeSet::new(),
        native_runtime_namespace_symbols: BTreeSet::new(),
        boundary_sites: Vec::new(),
        reserved_boundary_attributes: Vec::new(),
        unsupported_qualified_suspense: Vec::new(),
        collection_factory_symbols: BTreeSet::new(),
        keyed_collection_type_symbols: keyed_collection_type_imports.symbols,
        typed_keyed_collection_symbols: BTreeSet::new(),
        typed_keyed_collection_alias_symbols: BTreeSet::new(),
        keyed_collection_symbols: BTreeSet::new(),
        keyed_collection_alias_symbols: BTreeSet::new(),
        collection_alias_edges: Vec::new(),
        unsupported_collection_factory_import: None,
        unsupported_collection_maps: Vec::new(),
        aliased_collection_maps: Vec::new(),
        pending_collection_maps: Vec::new(),
        collection_references: Vec::new(),
        event_handler_symbols: BTreeSet::new(),
        event_callback_spans: Vec::new(),
        function_binding_spans: Vec::new(),
        current_declaration_is_const: false,
        unsupported_import_shape: false,
        unscoped_hook_calls: Vec::new(),
        unsupported_effect_arity: false,
        unsupported_store_arity: false,
        invalid_store_hook_name: None,
        function_depth: 0,
        loop_depth: 0,
        invalid_ownership_calls: Vec::new(),
        nested_components: Vec::new(),
        unsupported_component_forms: Vec::new(),
        arrow_component_stack: Vec::new(),
    };
    collector.visit_program(&parsed.program);
    collector
        .keyed_collection_symbols
        .retain(|symbol| !semantic.scoping().symbol_is_mutated(*symbol));
    collector
        .typed_keyed_collection_symbols
        .retain(|symbol| !semantic.scoping().symbol_is_mutated(*symbol));
    loop {
        let aliases: Vec<_> = collector
            .collection_alias_edges
            .iter()
            .filter_map(|edge| {
                let source_is_collection =
                    collector.keyed_collection_symbols.contains(&edge.source)
                        || collector
                            .keyed_collection_alias_symbols
                            .contains(&edge.source);
                (source_is_collection && !semantic.scoping().symbol_is_mutated(edge.alias))
                    .then_some(edge.alias)
            })
            .collect();
        let mut changed = false;
        for alias in aliases {
            changed |= collector.keyed_collection_alias_symbols.insert(alias);
        }
        if !changed {
            break;
        }
    }
    loop {
        let aliases: Vec<_> = collector
            .collection_alias_edges
            .iter()
            .filter_map(|edge| {
                (collector
                    .typed_keyed_collection_symbols
                    .contains(&edge.source)
                    || collector
                        .typed_keyed_collection_alias_symbols
                        .contains(&edge.source))
                .then_some(edge.alias)
            })
            .filter(|alias| !semantic.scoping().symbol_is_mutated(*alias))
            .collect();
        let mut changed = false;
        for alias in aliases {
            changed |= collector.typed_keyed_collection_alias_symbols.insert(alias);
        }
        if !changed {
            break;
        }
    }
    for pending in &collector.pending_collection_maps {
        if collector.keyed_collection_symbols.contains(&pending.symbol)
            || collector
                .typed_keyed_collection_alias_symbols
                .contains(&pending.symbol)
        {
            if !pending.valid_callback {
                collector
                    .unsupported_collection_maps
                    .push(pending.call.clone());
                continue;
            }
            if let (Some(component), Some(row_parameter)) = (
                collector.components.get_mut(&pending.component_name),
                pending.row_parameter.as_ref(),
            ) {
                let ordinal = component.collection_sites.len();
                component.collection_sites.push(CollectionSiteIr {
                    ordinal,
                    site_id: format!(
                        "{}#component:{}#collection:{}",
                        path, pending.component_name, ordinal
                    ),
                    source_expression: pending.source_expression.clone(),
                    row_parameter: row_parameter.clone(),
                    collection_symbol: pending.symbol,
                    receiver: pending.receiver.clone(),
                    requires_owner_render: false,
                    callee: pending.callee.clone(),
                    call: pending.call.clone(),
                });
            }
        } else if collector
            .keyed_collection_alias_symbols
            .contains(&pending.symbol)
        {
            collector.aliased_collection_maps.push(pending.call.clone());
        }
    }
    let mut event_function_spans = collector.event_callback_spans.clone();
    event_function_spans.extend(
        collector
            .function_binding_spans
            .iter()
            .filter(|(symbol, _)| collector.event_handler_symbols.contains(symbol))
            .map(|(_, function_span)| function_span.clone()),
    );
    let outside_collection_reads: BTreeSet<_> = collector
        .collection_references
        .iter()
        .filter(|read| {
            collector.keyed_collection_symbols.contains(&read.symbol)
                || collector
                    .keyed_collection_alias_symbols
                    .contains(&read.symbol)
        })
        .filter(|read| {
            !collector.collection_alias_edges.iter().any(|edge| {
                edge.source == read.symbol
                    && collector
                        .typed_keyed_collection_alias_symbols
                        .contains(&edge.alias)
                    && edge.source_span.start == read.span.start
                    && edge.source_span.end == read.span.end
            })
        })
        .filter(|read| {
            !event_function_spans
                .iter()
                .any(|event| event.start <= read.span.start && event.end >= read.span.end)
        })
        .filter(|read| {
            !collector.components.values().any(|component| {
                component.collection_sites.iter().any(|site| {
                    site.collection_symbol == read.symbol
                        && site.receiver.start == read.span.start
                        && site.receiver.end == read.span.end
                })
            })
        })
        .map(|read| read.symbol)
        .collect();
    for component in collector.components.values_mut() {
        for site in &mut component.collection_sites {
            site.requires_owner_render = outside_collection_reads.contains(&site.collection_symbol);
        }
    }
    if let Some(at) = collector.unsupported_collection_factory_import.as_ref() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "native collections require a direct, unaliased `createKeyedCollection` import",
        ));
    }
    if let Some(at) = collector.aliased_collection_maps.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "mapping a collection alias is unsupported; call `.map` on the direct `createKeyedCollection` binding",
        ));
    }
    if let Some(at) = collector.unsupported_collection_maps.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "native collection `.map` requires one inline, synchronous, one-parameter arrow callback returning JSX; index parameters and thisArg are unsupported",
        ));
    }
    if collector.unsupported_import_shape {
        return Err(format!(
            "{path}:1:1: native hooks require direct named `useState`/`useEffect`/`use`/`useStore` imports from `native_runtime_api.ts`; aliases, type-only imports, and mixed helper declarations are unsupported"
        ));
    }
    if let Some(at) = collector.reserved_boundary_attributes.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "`__nativeBoundarySite` is reserved for compiler-generated native Suspense boundary identities",
        ));
    }
    if let Some(at) = collector.unsupported_qualified_suspense.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "qualified native Suspense imports are unsupported; import `Suspense` directly from `native_runtime_api.ts`",
        ));
    }
    if let Some((at, kind)) = collector.unsupported_component_forms.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            &format!(
                "native hooks in {kind} components are unsupported; use a synchronous named function declaration"
            ),
        ));
    }
    if let Some(at) = collector.unscoped_hook_calls.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "native hooks must be called directly inside a named capitalized function component",
        ));
    }
    if let Some(at) = collector.nested_components.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "nested capitalized function components are unsupported; define the component at module scope",
        ));
    }
    if let Some(at) = collector.invalid_ownership_calls.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "native hooks inside repeated loops or nested callbacks are unsupported; move the hook to the component function body",
        ));
    }
    if collector.unsupported_effect_arity {
        return Err(format!(
            "{path}:1:1: `useEffect` requires exactly one setup callback"
        ));
    }
    if collector.unsupported_store_arity {
        let hook_name = collector
            .invalid_store_hook_name
            .as_deref()
            .unwrap_or("use");
        return Err(format!(
            "{path}:1:1: `{hook_name}` requires exactly one source expression"
        ));
    }
    let state_plan = collector.into_plan();
    let import_span = state_plan
        .hook_import
        .clone()
        .or_else(|| state_plan.runtime_import.clone())
        .ok_or_else(|| {
            format!("{path}:1:1: native components require an import from native_runtime_api.ts")
        })?;
    let module_source = state_plan
        .hook_module
        .as_deref()
        .or(state_plan.runtime_module.as_deref());
    if !module_source.is_some_and(is_native_runtime_module) {
        return Err(format_source_error(
            path,
            source,
            import_span.start,
            "native components and hooks must be imported from `native_runtime_api.ts`",
        ));
    }
    if state_plan.components.is_empty() {
        return Err(format!(
            "{path}:1:1: no capitalized synchronous function components found"
        ));
    }
    for component in &state_plan.components {
        let declaration = slice(source, component.declaration.clone());
        if !declaration.starts_with(&format!("function {}", component.name)) {
            return Err(format_source_error(
                path,
                source,
                component.declaration.start,
                &format!(
                    "component `{}` must be a synchronous function declaration",
                    component.name
                ),
            ));
        }
    }
    let call_sites = state_plan
        .components
        .iter()
        .flat_map(|component| {
            component
                .state_sites
                .iter()
                .map(|state| ((state.call.start, state.call.end), state.site_id.clone()))
        })
        .collect();
    let mut usage = NativeStateUsageCollector {
        semantic: &semantic,
        call_sites,
        bindings: BTreeMap::new(),
        setter_symbols: BTreeSet::new(),
        current_declaration_is_const: false,
        candidates: Vec::new(),
        intrinsic_opening: Vec::new(),
        outside_state_reads: BTreeSet::new(),
        numeric_sites: BTreeSet::new(),
    };
    usage.visit_program(&parsed.program);
    let mut prop_edits = Vec::<(SourceSpan, String, String, bool, Option<usize>)>::new();
    let mut numeric_programs = Vec::<(String, String, Vec<String>)>::new();
    let mut prop_sites = BTreeSet::new();
    let mut fallback_sites = BTreeSet::new();
    let mut layout_eligible_sites = BTreeSet::new();
    struct CandidateClassification<'a> {
        owner_program_id: Option<String>,
        bindings: Vec<&'a NativeStateBinding>,
        site_ids: BTreeSet<String>,
        certified: bool,
    }
    let mut classifications = Vec::with_capacity(usage.candidates.len());
    for candidate in &usage.candidates {
        if candidate.state_refs.is_empty() {
            classifications.push(CandidateClassification {
                owner_program_id: None,
                bindings: Vec::new(),
                site_ids: BTreeSet::new(),
                certified: false,
            });
            continue;
        }
        let expression = slice(source, candidate.span.clone());
        let mut bindings: Vec<_> = candidate
            .state_refs
            .iter()
            .filter_map(|symbol| usage.bindings.get(symbol))
            .collect();
        let owner_component = state_plan.components.iter().find(|component| {
            component.declaration.start <= candidate.span.start
                && candidate.span.end <= component.declaration.end
        });
        if let Some(component) = owner_component {
            bindings.sort_by_key(|binding| {
                component
                    .state_sites
                    .iter()
                    .position(|state| state.site_id == binding.site_id)
                    .unwrap_or(usize::MAX)
            });
        }
        let site_ids: BTreeSet<_> = bindings
            .iter()
            .map(|binding| binding.site_id.clone())
            .collect();
        let names: BTreeSet<_> = bindings
            .iter()
            .map(|binding| binding.name.clone())
            .collect();
        let owner_sites: BTreeSet<_> = owner_component
            .into_iter()
            .flat_map(|component| component.state_sites.iter())
            .map(|state| state.site_id.as_str())
            .collect();
        let owner_local = owner_component.is_some_and(|_| {
            site_ids
                .iter()
                .all(|site| owner_sites.contains(site.as_str()))
        });
        let certified = !candidate.other_refs
            && owner_local
            && !state_plan
                .components
                .iter()
                .flat_map(|component| &component.store_sites)
                .any(|store| {
                    candidate.span.start <= store.call.start && candidate.span.end >= store.call.end
                })
            && bindings.len() == candidate.state_refs.len()
            && bindings.iter().all(|binding| binding.immutable)
            && site_ids
                .iter()
                .all(|site| usage.numeric_sites.contains(site))
            && site_ids
                .iter()
                .all(|site| !usage.outside_state_reads.contains(site))
            && numeric_expression_is_pure(&expression, &names);
        classifications.push(CandidateClassification {
            owner_program_id: owner_component.map(|component| component.component_site_id.clone()),
            bindings,
            site_ids,
            certified,
        });
    }
    let mut ineligible_numeric_sites = usage.outside_state_reads.clone();
    for classification in &classifications {
        if !classification.certified {
            ineligible_numeric_sites.extend(classification.site_ids.iter().cloned());
        }
    }
    for (candidate, classification) in usage.candidates.iter().zip(&classifications) {
        if candidate.state_refs.is_empty() {
            continue;
        }
        let bindings = &classification.bindings;
        let site_ids = &classification.site_ids;
        let pure = classification.certified
            && site_ids
                .iter()
                .all(|site| !ineligible_numeric_sites.contains(site));
        if pure {
            let owner_program_id = classification
                .owner_program_id
                .clone()
                .expect("owner-local numeric candidate has an owner");
            let ordered = bindings;
            let singular = ordered.len() == 1;
            let ids = ordered
                .iter()
                .map(|binding| serde_json::to_string(&binding.site_id).unwrap_or_default())
                .collect::<Vec<_>>()
                .join(", ");
            let parameters = ordered
                .iter()
                .map(|binding| binding.name.as_str())
                .collect::<Vec<_>>()
                .join(", ");
            let prefix = if singular {
                format!("({ids}, ({parameters}) => (")
            } else {
                format!("([{ids}], ([{parameters}]) => (")
            };
            let descriptor_index = numeric_programs.len();
            let source_sites = ordered
                .iter()
                .map(|binding| binding.site_id.clone())
                .collect();
            let sink_id = format!("{path}#numeric-sink:{}", candidate.span.start);
            numeric_programs.push((owner_program_id, sink_id, source_sites));
            prop_edits.push((
                candidate.span.clone(),
                prefix,
                "))".to_owned(),
                singular,
                Some(descriptor_index),
            ));
            prop_sites.extend(ordered.iter().map(|binding| binding.site_id.clone()));
            layout_eligible_sites.extend(site_ids.iter().cloned());
        } else {
            fallback_sites.extend(bindings.iter().map(|binding| binding.site_id.clone()));
        }
    }
    usage.outside_state_reads.extend(fallback_sites);
    let component_prop_sites: BTreeMap<_, _> = state_plan
        .components
        .iter()
        .map(|component| {
            let sites = component
                .state_sites
                .iter()
                .filter(|state| {
                    prop_sites.contains(&state.site_id)
                        && !usage.outside_state_reads.contains(&state.site_id)
                })
                .map(|state| state.site_id.clone())
                .collect::<BTreeSet<_>>();
            (component.component_site_id.clone(), sites)
        })
        .collect();
    let component_state_layouts: BTreeMap<_, _> = state_plan
        .components
        .iter()
        .map(|component| {
            let prop_sites = component_prop_sites
                .get(&component.component_site_id)
                .cloned()
                .unwrap_or_default();
            let slots = component
                .state_sites
                .iter()
                .filter(|state| {
                    prop_sites.contains(&state.site_id)
                        && layout_eligible_sites.contains(&state.site_id)
                })
                .enumerate()
                .map(|(slot, state)| NativeStateLayoutSlotMetadata {
                    site_id: state.site_id.clone(),
                    slot,
                })
                .collect::<Vec<_>>();
            (component.component_site_id.clone(), slots)
        })
        .collect();
    let (transformed, edits) = transform_native_component_source(
        path,
        source,
        &state_plan,
        &prop_edits,
        &numeric_programs,
        &component_prop_sites,
        &component_state_layouts,
    )?;
    let components = state_plan
        .components
        .iter()
        .map(|component| NativeComponentMetadata {
            name: component.name.clone(),
            component_site_id: component.component_site_id.clone(),
            host_leaf_output: component.host_leaf_output,
            prop_only_sites: component_prop_sites
                .get(&component.component_site_id)
                .into_iter()
                .flatten()
                .cloned()
                .collect(),
            state_layout: component_state_layouts
                .get(&component.component_site_id)
                .filter(|slots| !slots.is_empty())
                .cloned()
                .map(|slots| NativeStateLayoutMetadata {
                    schema_version: 1,
                    program_id: Some(component.component_site_id.clone()),
                    slots,
                }),
            state_sites: component
                .state_sites
                .iter()
                .map(|state| {
                    let call = slice(source, state.call.clone());
                    let initial = call
                        .find('(')
                        .and_then(|open| {
                            call.rfind(')')
                                .filter(|close| *close > open)
                                .map(|close| call[open + 1..close].trim().to_owned())
                        })
                        .filter(|value| !value.is_empty());
                    NativeStateSiteMetadata {
                        site_id: state.site_id.clone(),
                        initial_value: initial,
                    }
                })
                .collect(),
            effect_sites: component
                .effect_sites
                .iter()
                .map(|effect| NativeEffectSiteMetadata {
                    site_id: effect.site_id.clone(),
                })
                .collect(),
            store_sites: component
                .store_sites
                .iter()
                .map(|store| NativeStoreSiteMetadata {
                    site_id: store.site_id.clone(),
                    source_expression: store.source_expression.clone(),
                })
                .collect(),
            collection_sites: component
                .collection_sites
                .iter()
                .map(|collection| NativeCollectionSiteMetadata {
                    site_id: collection.site_id.clone(),
                    source_expression: collection.source_expression.clone(),
                    row_parameter: collection.row_parameter.clone(),
                    requires_owner_render: collection.requires_owner_render,
                })
                .collect(),
        })
        .collect();
    Ok((transformed, components, edits))
}

fn numeric_expression_is_pure(source: &str, state_names: &BTreeSet<String>) -> bool {
    if source.contains("=>")
        || source.contains("++")
        || source.contains("--")
        || source.contains("?.")
        || source.contains('=')
    {
        return false;
    }
    let chars: Vec<char> = source.chars().collect();
    let mut index = 0;
    while index < chars.len() {
        let current = chars[index];
        if current.is_whitespace() {
            index += 1;
            continue;
        }
        if current == '`' {
            index += 1;
            while index < chars.len() {
                if chars[index] == '\\' {
                    index += 2;
                    continue;
                }
                if chars[index] == '`' {
                    index += 1;
                    break;
                }
                if chars[index] == '$' && chars.get(index + 1) == Some(&'{') {
                    index += 2;
                    let expression_start = index;
                    let mut depth = 1usize;
                    while index < chars.len() && depth > 0 {
                        match chars[index] {
                            '{' => depth += 1,
                            '}' => depth -= 1,
                            _ => {}
                        }
                        if depth > 0 {
                            index += 1;
                        }
                    }
                    if depth != 0 {
                        return false;
                    }
                    let nested: String = chars[expression_start..index].iter().collect();
                    if !numeric_expression_is_pure(&nested, state_names) {
                        return false;
                    }
                    index += 1;
                    continue;
                }
                index += 1;
            }
            continue;
        }
        if current == '\'' || current == '"' {
            let quote = current;
            index += 1;
            while index < chars.len() {
                if chars[index] == '\\' {
                    index += 2;
                    continue;
                }
                if chars[index] == quote {
                    index += 1;
                    break;
                }
                index += 1;
            }
            continue;
        }
        if current.is_ascii_digit() {
            index += 1;
            while index < chars.len()
                && (chars[index].is_ascii_alphanumeric()
                    || matches!(chars[index], '.' | '_' | 'x' | 'X'))
            {
                index += 1;
            }
            continue;
        }
        if current == '_' || current == '$' || current.is_ascii_alphabetic() {
            let start = index;
            index += 1;
            while index < chars.len()
                && (chars[index] == '_'
                    || chars[index] == '$'
                    || chars[index].is_ascii_alphanumeric())
            {
                index += 1;
            }
            let name: String = chars[start..index].iter().collect();
            if !state_names.contains(&name)
                && !matches!(name.as_str(), "true" | "false" | "null" | "undefined")
            {
                return false;
            }
            let mut next = index;
            while next < chars.len() && chars[next].is_whitespace() {
                next += 1;
            }
            if next < chars.len() && chars[next] == '(' {
                return false;
            }
            continue;
        }
        if matches!(
            current,
            '+' | '-'
                | '*'
                | '/'
                | '%'
                | '?'
                | ':'
                | '('
                | ')'
                | '['
                | ']'
                | ','
                | '!'
                | '<'
                | '>'
                | '&'
                | '|'
        ) {
            index += 1;
            continue;
        }
        return false;
    }
    true
}

fn transform_native_component_source(
    path: &str,
    source: &str,
    plan: &ComponentStateSitesPlan,
    prop_edits: &[(SourceSpan, String, String, bool, Option<usize>)],
    numeric_programs: &[(String, String, Vec<String>)],
    prop_sites: &BTreeMap<String, BTreeSet<String>>,
    state_layouts: &BTreeMap<String, Vec<NativeStateLayoutSlotMetadata>>,
) -> Result<(String, Vec<NativeModuleEdit>), String> {
    let import_span = plan
        .hook_import
        .as_ref()
        .or(plan.runtime_import.as_ref())
        .ok_or_else(|| format!("{path}:1:1: missing native runtime import"))?;
    let mut aliases = vec![
        "__nativeDefineComponent".to_owned(),
        "__nativeUseStateAt".to_owned(),
        "__nativeUseEffectAt".to_owned(),
        "__nativeUseStoreAt".to_owned(),
        "__nativeBindStatePropsAt".to_owned(),
        "__nativeRenderCollectionAt".to_owned(),
        "__nativeUseAt".to_owned(),
        "__nativeBindStatePropAt".to_owned(),
        "__nativeNumericPrograms".to_owned(),
    ];
    for alias in &mut aliases {
        while source.contains(alias.as_str()) {
            alias.push('_');
        }
    }
    let module = serde_json::to_string(
        plan.hook_module
            .as_deref()
            .or(plan.runtime_module.as_deref())
            .ok_or_else(|| format!("{path}: missing native runtime module source"))?,
    )
    .map_err(|error| error.to_string())?;
    let helper_import = format!(
        "\nimport {{ defineComponent as {}, useStateAt as {}, useEffectAt as {}, useStoreAt as {}, bindStatePropsAt as {}, renderCollectionAt as {}, useAt as {}, bindStatePropAt as {} }} from {module};",
        aliases[0],
        aliases[1],
        aliases[2],
        aliases[3],
        aliases[4],
        aliases[5],
        aliases[6],
        aliases[7]
    );
    let numeric_program_table = if numeric_programs.is_empty() {
        String::new()
    } else {
        let descriptors = numeric_programs
            .iter()
            .map(|(owner_program_id, sink_id, source_sites)| {
                let owner_program_id = serde_json::to_string(owner_program_id).unwrap_or_default();
                let sink_id = serde_json::to_string(sink_id).unwrap_or_default();
                let source_sites = source_sites
                    .iter()
                    .map(|site| serde_json::to_string(site).unwrap_or_default())
                    .collect::<Vec<_>>()
                    .join(", ");
                format!("{{ schemaVersion: 2, ownerProgramId: {owner_program_id}, sinkId: {sink_id}, sourceSites: [{source_sites}] }}")
            })
            .collect::<Vec<_>>()
            .join(", ");
        format!("\nconst {} = [{descriptors}] as const;", aliases[8])
    };
    let mut edits = Vec::new();
    let mut registrations = String::new();
    for component in &plan.components {
        let site = serde_json::to_string(&component.component_site_id)
            .map_err(|error| error.to_string())?;
        let sites = prop_sites
            .get(&component.component_site_id)
            .cloned()
            .unwrap_or_default();
        let sites = sites
            .iter()
            .map(|site| serde_json::to_string(site).unwrap_or_default())
            .collect::<Vec<_>>()
            .join(", ");
        let state_layout_option = state_layouts
            .get(&component.component_site_id)
            .filter(|slots| !slots.is_empty())
            .map(|slots| {
                let slots = slots
                    .iter()
                    .map(|slot| {
                        let site_id = serde_json::to_string(&slot.site_id).unwrap_or_default();
                        format!("{{ siteId: {site_id}, slot: {} }}", slot.slot)
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                format!(
                    ", stateLayout: {{ schemaVersion: 1, programId: {site}, slots: [{slots}] }}"
                )
            })
            .unwrap_or_default();
        registrations.push_str(&format!(
            "\n{}({}, {}, {{ propOnlySites: [{}]{}{} }});",
            aliases[0],
            site,
            component.name,
            sites,
            if component.host_leaf_output {
                ", hostLeafOutput: true"
            } else {
                ""
            },
            state_layout_option,
        ));
        for state in &component.state_sites {
            let site = serde_json::to_string(&state.site_id).map_err(|error| error.to_string())?;
            edits.push(TextEdit {
                start: state.callee.start as usize,
                end: state.callee.end as usize,
                replacement: aliases[1].clone(),
            });
            let insertion = state.argument_insert_at as usize;
            edits.push(TextEdit {
                start: insertion,
                end: insertion,
                replacement: format!("{site}, "),
            });
        }
        for effect in &component.effect_sites {
            let site = serde_json::to_string(&effect.site_id).map_err(|error| error.to_string())?;
            edits.push(TextEdit {
                start: effect.callee.start as usize,
                end: effect.callee.end as usize,
                replacement: aliases[2].clone(),
            });
            let insertion = effect.argument_insert_at as usize;
            edits.push(TextEdit {
                start: insertion,
                end: insertion,
                replacement: format!("{site}, "),
            });
        }
        for store in &component.store_sites {
            let site = serde_json::to_string(&store.site_id).map_err(|error| error.to_string())?;
            let helper_alias = if store.hook_name == "use" {
                &aliases[6]
            } else {
                &aliases[3]
            };
            edits.push(TextEdit {
                start: store.callee.start as usize,
                end: store.callee.end as usize,
                replacement: helper_alias.clone(),
            });
            edits.push(TextEdit {
                start: store.argument_insert_at as usize,
                end: store.argument_insert_at as usize,
                replacement: format!("{site}, "),
            });
        }
        for collection in &component.collection_sites {
            let site =
                serde_json::to_string(&collection.site_id).map_err(|error| error.to_string())?;
            edits.push(TextEdit {
                start: collection.callee.start as usize,
                end: collection.callee.end as usize,
                replacement: format!(
                    "{}({}, {}, ",
                    aliases[5], site, collection.source_expression
                ),
            });
            edits.push(TextEdit {
                start: collection.call.end as usize,
                end: collection.call.end as usize,
                replacement: if collection.requires_owner_render {
                    ", { requiresOwnerRender: true })".to_owned()
                } else {
                    ")".to_owned()
                },
            });
        }
    }
    for boundary in &plan.boundary_sites {
        let site = serde_json::to_string(&boundary.site_id).map_err(|error| error.to_string())?;
        let close_angle = boundary.opening.end.saturating_sub(1) as usize;
        if source.as_bytes().get(close_angle) != Some(&b'>') {
            return Err(format!(
                "{path}: internal native Suspense transform error: opening tag has no closing angle bracket"
            ));
        }
        let opening_start = boundary.opening.start as usize;
        let trailing = source[opening_start..close_angle].trim_end();
        let self_closing = trailing.ends_with('/');
        let insert_at = if self_closing {
            opening_start + trailing.len() - 1
        } else {
            close_angle
        };
        let separator = if source[..insert_at]
            .chars()
            .next_back()
            .is_some_and(char::is_whitespace)
        {
            ""
        } else {
            " "
        };
        edits.push(TextEdit {
            start: insert_at,
            end: insert_at,
            replacement: format!(
                "{separator}__nativeBoundarySite={site}{}",
                if self_closing { " " } else { "" }
            ),
        });
    }
    for (prop_span, prefix, suffix, singular, descriptor_index) in prop_edits {
        let helper_alias = if *singular { &aliases[7] } else { &aliases[4] };
        edits.push(TextEdit {
            start: prop_span.start as usize,
            end: prop_span.start as usize,
            replacement: format!("{}{}", helper_alias, prefix),
        });
        edits.push(TextEdit {
            start: prop_span.end as usize,
            end: prop_span.end as usize,
            replacement: if let Some(index) = descriptor_index {
                format!("), {}[{index}])", aliases[8])
            } else {
                suffix.clone()
            },
        });
    }
    edits.push(TextEdit {
        start: import_span.end as usize,
        end: import_span.end as usize,
        replacement: format!("{helper_import}{numeric_program_table}{registrations}"),
    });
    // Coalesce overlapping nested-use edits so Vite receives one non-overlapping
    // source-map edit.
    edits.sort_by(|left, right| left.start.cmp(&right.start).then(left.end.cmp(&right.end)));
    let mut normalized_edits = Vec::with_capacity(edits.len());
    let mut edit_index = 0;
    while edit_index < edits.len() {
        let start = edits[edit_index].start;
        let mut group_end = edit_index + 1;
        while group_end < edits.len() && edits[group_end].start == start {
            group_end += 1;
        }
        let group = &edits[edit_index..group_end];
        let replacement = group.iter().find(|edit| edit.end > start);
        let insertions = group
            .iter()
            .filter(|edit| edit.end == start)
            .collect::<Vec<_>>();
        if let Some(replacement) = replacement.filter(|_| !insertions.is_empty()) {
            let prefix = insertions
                .iter()
                .map(|edit| edit.replacement.as_str())
                .collect::<String>();
            normalized_edits.push(TextEdit {
                start,
                end: replacement.end,
                replacement: format!("{prefix}{}", replacement.replacement),
            });
        } else {
            normalized_edits.extend(group.iter().cloned());
        }
        edit_index = group_end;
    }
    let mut edits = normalized_edits;
    edits.sort_by(|left, right| right.start.cmp(&left.start).then(right.end.cmp(&left.end)));
    let mut transformed = source.to_owned();
    let mut previous_start = source.len();
    for edit in &edits {
        if edit.end > previous_start || edit.start > edit.end || edit.end > transformed.len() {
            return Err(format!(
                "{path}: internal component transform error: overlapping or out-of-bounds edits"
            ));
        }
        transformed.replace_range(edit.start..edit.end, &edit.replacement);
        previous_start = edit.start;
    }
    let serialized_edits = edits
        .into_iter()
        .map(|edit| NativeModuleEdit {
            start: byte_offset_to_utf16(source, edit.start as u32),
            end: byte_offset_to_utf16(source, edit.end as u32),
            replacement: edit.replacement,
        })
        .collect();
    Ok((transformed, serialized_edits))
}

fn serve_native() -> Result<(), String> {
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout().lock());
    for line in stdin.lock().lines() {
        let line = line.map_err(|error| format!("reading request: {error}"))?;
        if line.trim().is_empty() {
            continue;
        }
        let response = match serde_json::from_str::<NativeModuleRequest>(&line) {
            Ok(request) => compile_native_module(request),
            Err(error) => NativeModuleResponse {
                id: String::new(),
                code: String::new(),
                plan: None,
                edits: Vec::new(),
                component_edits: None,
                error: Some(format!("invalid native-module request JSON: {error}")),
            },
        };
        serde_json::to_writer(&mut stdout, &response)
            .map_err(|error| format!("writing response: {error}"))?;
        stdout
            .write_all(b"\n")
            .map_err(|error| format!("writing response: {error}"))?;
        stdout
            .flush()
            .map_err(|error| format!("flushing response: {error}"))?;
    }
    Ok(())
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
        return Err(format!(
            "unsupported template: dynamic host attribute `{unsupported}` is not represented by the compiled plan"
        ));
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
            return Err(format!(
                "unsupported template: binding source must be the map item `{}` or a static dotted path rooted in a shared input",
                map.item_parameter
            ));
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

fn generated_component_state_sites_module(
    plan: &ComponentStateSitesPlan,
) -> Result<String, String> {
    serde_json::to_string(plan)
        .map(|json| format!("// Generated by the OXC UI graph compiler. Do not edit by hand.\nexport const componentStateSitesPlan = {json} as const;\n"))
        .map_err(|error| error.to_string())
}

fn generated_async_task_plan_module(plan: &AsyncTaskPlanIr) -> Result<String, String> {
    serde_json::to_string(plan)
        .map(|json| format!("// Generated by the OXC UI graph compiler. Do not edit by hand.\nexport const compiledAsyncTaskPlan = {json} as const;\n"))
        .map_err(|error| error.to_string())
}

#[derive(Clone)]
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
    let import_span = plan.hook_import.as_ref().ok_or_else(
        || "unsupported transform: expected one named `useState` and/or `useEffect` import",
    )?;
    let mut edits = Vec::new();
    let runtime_import =
        serde_json::to_string(runtime_import).map_err(|error| error.to_string())?;
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
                format!(
                    "internal transform error: missing `(` for {}",
                    state_site.site_id
                )
            })?;
            let close = call_source.rfind(')').ok_or_else(|| {
                format!(
                    "internal transform error: missing `)` for {}",
                    state_site.site_id
                )
            })?;
            if close < open {
                return Err(format!(
                    "internal transform error: invalid call span for {}",
                    state_site.site_id
                ));
            }
            let arguments = call_source[open + 1..close].trim();
            let arguments = if arguments.is_empty() {
                "undefined"
            } else {
                arguments
            };
            let site_id =
                serde_json::to_string(&state_site.site_id).map_err(|error| error.to_string())?;
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
                format!(
                    "internal transform error: missing `(` for {}",
                    effect_site.site_id
                )
            })?;
            let close = call_source.rfind(')').ok_or_else(|| {
                format!(
                    "internal transform error: missing `)` for {}",
                    effect_site.site_id
                )
            })?;
            if close < open {
                return Err(format!(
                    "internal transform error: invalid call span for {}",
                    effect_site.site_id
                ));
            }
            let arguments = call_source[open + 1..close].trim();
            let site_id =
                serde_json::to_string(&effect_site.site_id).map_err(|error| error.to_string())?;
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
            return Err(
                "internal transform error: overlapping or out-of-bounds source edits".to_owned(),
            );
        }
        transformed.replace_range(edit.start..edit.end, &edit.replacement);
        previous_start = edit.start;
    }
    Ok(format!(
        "/** @jsxRuntime classic */\n/** @jsx jsx */\n/** @jsxFrag Fragment */\n{transformed}"
    ))
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
                                // Keep a stable placeholder for repeated-host templates without an index;
                                // derived keyed regions need only the item parameter.
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
    if env::args().any(|argument| argument == "--serve-native") {
        return serve_native();
    }
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
            fs::write(output, generated_async_task_plan_module(&plan)?)
                .map_err(|error| error.to_string())?;
        }
        return Ok(());
    }

    let component_state_mode = env::args().any(|argument| argument == "--component-state-sites");
    let transform_component_state =
        env::args().any(|argument| argument == "--transform-component-state");
    if component_state_mode || transform_component_state {
        let mut collector = ComponentStateSiteCollector {
            source_file: &path,
            source: &source,
            semantic: &semantic,
            host_leaf_facts: collect_host_leaf_facts(&parsed.program, &semantic),
            component_stack: Vec::new(),
            components: BTreeMap::new(),
            hook_import: None,
            runtime_import: None,
            runtime_module: None,
            hook_module: None,
            imported_hooks: BTreeSet::new(),
            native_suspense_symbols: BTreeSet::new(),
            native_runtime_namespace_symbols: BTreeSet::new(),
            boundary_sites: Vec::new(),
            reserved_boundary_attributes: Vec::new(),
            unsupported_qualified_suspense: Vec::new(),
            collection_factory_symbols: BTreeSet::new(),
            keyed_collection_type_symbols: BTreeSet::new(),
            typed_keyed_collection_symbols: BTreeSet::new(),
            typed_keyed_collection_alias_symbols: BTreeSet::new(),
            keyed_collection_symbols: BTreeSet::new(),
            keyed_collection_alias_symbols: BTreeSet::new(),
            collection_alias_edges: Vec::new(),
            unsupported_collection_factory_import: None,
            unsupported_collection_maps: Vec::new(),
            aliased_collection_maps: Vec::new(),
            pending_collection_maps: Vec::new(),
            collection_references: Vec::new(),
            event_handler_symbols: BTreeSet::new(),
            event_callback_spans: Vec::new(),
            function_binding_spans: Vec::new(),
            current_declaration_is_const: false,
            unsupported_import_shape: false,
            unscoped_hook_calls: Vec::new(),
            unsupported_effect_arity: false,
            unsupported_store_arity: false,
            invalid_store_hook_name: None,
            function_depth: 0,
            loop_depth: 0,
            invalid_ownership_calls: Vec::new(),
            nested_components: Vec::new(),
            unsupported_component_forms: Vec::new(),
            arrow_component_stack: Vec::new(),
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
            let runtime_import_index = env::args()
                .position(|argument| argument == "--runtime-import")
                .ok_or_else(|| {
                    "--transform-component-state requires --runtime-import <path>".to_owned()
                })?;
            let runtime_import = env::args()
                .nth(runtime_import_index + 1)
                .ok_or_else(|| "--runtime-import requires a path".to_owned())?;
            let jsx_import_index = env::args()
                .position(|argument| argument == "--jsx-import")
                .ok_or_else(|| {
                    "--transform-component-state requires --jsx-import <path>".to_owned()
                })?;
            let jsx_import = env::args()
                .nth(jsx_import_index + 1)
                .ok_or_else(|| "--jsx-import requires a path".to_owned())?;
            let transform_index = env::args()
                .position(|argument| argument == "--emit-transform")
                .ok_or_else(|| {
                    "--transform-component-state requires --emit-transform <path>".to_owned()
                })?;
            let transformed_path = env::args()
                .nth(transform_index + 1)
                .ok_or_else(|| "--emit-transform requires a path".to_owned())?;
            let transformed =
                transform_component_state_source(&source, &plan, &runtime_import, &jsx_import)?;
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

#[cfg(test)]
mod native_module_tests {
    use super::*;

    fn compile(path: &str, source: &str) -> NativeModuleResponse {
        compile_native_module(NativeModuleRequest {
            id: "fixture".to_owned(),
            path: path.to_owned(),
            source: source.to_owned(),
            helper_module: "@runtime/tasks".to_owned(),
            component_module: None,
        })
    }

    fn compile_state(path: &str, source: &str) -> NativeModuleResponse {
        compile_native_module(NativeModuleRequest {
            id: "state-fixture".to_owned(),
            path: path.to_owned(),
            source: source.to_owned(),
            helper_module: String::new(),
            component_module: None,
        })
    }

    fn utf16_to_byte(source: &str, target: usize) -> usize {
        if target == 0 {
            return 0;
        }
        let mut units = 0usize;
        for (byte, ch) in source.char_indices() {
            if units == target {
                return byte;
            }
            units += ch.len_utf16();
        }
        if units == target {
            source.len()
        } else {
            panic!("UTF-16 offset splits a surrogate pair")
        }
    }

    #[test]
    fn infers_task_and_external_edges_and_keeps_callback_source() {
        let source = include_str!("../../fixtures/native-module-positive.ts");
        let response = compile("native-module-positive.ts", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.expect("successful compile has a plan");
        assert_eq!(plan.schema_version, 1);
        assert_eq!(plan.tasks.len(), 2);
        assert_eq!(plan.tasks[0].depends_on, vec!["$request"]);
        assert_eq!(plan.tasks[1].depends_on, vec!["$target", "load-content"]);
        assert_eq!(plan.task_order, vec![0, 1]);
        assert!(
            response
                .code
                .contains("asyncTask(\"load-content\", [\"$request\"], async (input) => {")
        );
        assert!(
            response
                .code
                .contains("return { request, value: await fetch(`/content/${request}`) };")
        );
        assert!(response.code.contains(
            "asyncTask(\"compose-view\", [\"$target\",\"load-content\"], async (input) => {"
        ));
        assert_eq!(response.edits.len(), 2);
        let mut applied = source.to_owned();
        let mut edits = response.edits.clone();
        edits.sort_by_key(|edit| edit.start);
        for edit in edits.into_iter().rev() {
            let start = utf16_to_byte(&applied, edit.start);
            let end = utf16_to_byte(&applied, edit.end);
            applied.replace_range(start..end, &edit.replacement);
        }
        assert_eq!(
            response.code, applied,
            "serialized UTF-16 edits reproduce compiler code"
        );
    }

    #[test]
    fn three_argument_form_replaces_only_dependency_expression() {
        let source = include_str!("../../fixtures/native-module-three-args.ts");
        let response = compile("native-module-three-args.ts", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        assert_eq!(response.edits.len(), 1);
        assert_eq!(response.edits[0].replacement, "[\"$source\"]");
        assert!(response.code.contains("async (input: Map<string, unknown>) => {\n  // This body and comment remain byte-for-byte authored."));
        assert_eq!(
            response
                .code
                .matches("return input.get(\"$source\");")
                .count(),
            1
        );
    }

    #[test]
    fn rejects_alias_and_wrong_module_imports_with_positions() {
        let alias = compile(
            "native-module-alias.ts",
            include_str!("../../fixtures/native-module-alias.ts"),
        );
        assert!(
            alias
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-alias.ts:1:")
        );
        assert!(
            alias
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("aliased `asyncTask`")
        );
        let wrong = compile(
            "native-module-wrong-helper.ts",
            include_str!("../../fixtures/native-module-wrong-helper.ts"),
        );
        assert!(
            wrong
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-wrong-helper.ts:3:")
        );
        assert!(
            wrong
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("must be imported from `@runtime/tasks`")
        );
    }

    #[test]
    fn rejects_type_only_helper_imports() {
        let declaration = compile(
            "native-module-import-type.ts",
            include_str!("../../fixtures/native-module-import-type.ts"),
        );
        assert!(
            declaration
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-import-type.ts:1:")
        );
        assert!(
            declaration
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("runtime value")
        );
        let specifier = compile(
            "native-module-specifier-type.ts",
            include_str!("../../fixtures/native-module-specifier-type.ts"),
        );
        assert!(
            specifier
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-specifier-type.ts:1:")
        );
        assert!(
            specifier
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("type-only specifiers")
        );
    }

    #[test]
    fn rejects_unprefixed_external_and_computed_reads() {
        let unknown = compile(
            "native-module-undeclared-read.ts",
            include_str!("../../fixtures/native-module-undeclared-read.ts"),
        );
        assert!(
            unknown
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-undeclared-read.ts:3:")
        );
        assert!(
            unknown
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("prefix an external input with `$`")
        );
        let dynamic = compile(
            "native-module-dynamic-read.ts",
            include_str!("../../fixtures/native-module-dynamic-read.ts"),
        );
        assert!(
            dynamic
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-dynamic-read.ts:3:")
        );
        assert!(
            dynamic
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("literal `.get")
        );
        let alias = compile(
            "native-module-unsupported-read.ts",
            include_str!("../../fixtures/native-module-unsupported-read.ts"),
        );
        assert!(
            alias
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-unsupported-read.ts:3:")
        );
        assert!(
            alias
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("aliasing, destructuring")
        );
    }

    #[test]
    fn rejects_dependency_cycles() {
        let cycle = compile(
            "native-module-cycle.ts",
            include_str!("../../fixtures/native-module-cycle.ts"),
        );
        assert!(
            cycle
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-cycle.ts:3:")
        );
        assert!(
            cycle
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("dependency cycle")
        );
    }

    #[test]
    fn rejects_function_and_arrow_task_declarations() {
        let function = compile(
            "native-module-function-task.ts",
            include_str!("../../fixtures/native-module-function-task.ts"),
        );
        assert!(
            function
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-function-task.ts:4:")
        );
        assert!(
            function
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("direct top-level variable initializer")
        );
        let arrow = compile(
            "native-module-arrow-task.ts",
            include_str!("../../fixtures/native-module-arrow-task.ts"),
        );
        assert!(
            arrow
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-arrow-task.ts:3:")
        );
        assert!(
            arrow
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("direct top-level variable initializer")
        );
        let array = compile(
            "native-module-array.ts",
            include_str!("../../fixtures/native-module-array.ts"),
        );
        assert!(array.error.is_none(), "{:?}", array.error);
        assert_eq!(array.plan.expect("array tasks have a plan").tasks.len(), 2);
    }

    #[test]
    fn accepts_readonly_tuple_and_satisfies_task_array_initializers() {
        let source = r#"import { asyncTask } from "@runtime/tasks";
const tuple = [asyncTask("first", (values) => values.get("$request"))] as const;
const checked = [asyncTask("second", (values) => values.get("first"))] satisfies readonly unknown[];
export { tuple, checked };
"#;
        let response = compile("native-module-typed-arrays.ts", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.expect("typed task arrays have a plan");
        assert_eq!(plan.tasks.len(), 2);
        assert_eq!(plan.tasks[0].id, "first");
        assert_eq!(plan.tasks[1].id, "second");
        assert_eq!(plan.tasks[0].depends_on, vec!["$request"]);
        assert_eq!(plan.tasks[1].depends_on, vec!["first"]);

        for expression in [
            "makeTasks([asyncTask(\"nested\", (values) => values.get(\"$request\"))])",
            "[...[asyncTask(\"spread\", (values) => values.get(\"$request\"))]]",
        ] {
            let invalid = format!(
                "import {{ asyncTask }} from \"@runtime/tasks\";\nconst tasks = {expression};"
            );
            let rejected = compile("native-module-dynamic-array.ts", &invalid);
            assert!(
                rejected.error.as_deref().unwrap_or_default().contains(
                    "direct top-level variable initializer or direct element of a top-level array initializer"
                ),
                "unexpected diagnostic: {:?}",
                rejected.error
            );
        }
    }

    #[test]
    fn rejects_helper_alias_escape_and_dollar_task_ids() {
        let escape = compile(
            "native-module-helper-escape.ts",
            include_str!("../../fixtures/native-module-helper-escape.ts"),
        );
        assert!(
            escape
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-helper-escape.ts:3:")
        );
        assert!(
            escape
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("may only be used as a direct top-level task call")
        );
        let dollar = compile(
            "native-module-dollar-id.ts",
            include_str!("../../fixtures/native-module-dollar-id.ts"),
        );
        assert!(
            dollar
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-module-dollar-id.ts:3:")
        );
        assert!(
            dollar
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("cannot start with `$`")
        );
    }

    #[test]
    fn lowers_conditional_hook_sites_and_preserves_function_hoisting_and_utf16_edits() {
        let source = include_str!("../../fixtures/native-state-positive.tsx");
        let response = compile_state("native-state-positive.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.expect("component plan");
        assert_eq!(plan.schema_version, 2);
        assert!(plan.tasks.is_empty());
        let code = plan.component_module.expect("transformed component source");
        assert!(
            code.contains("function Counter("),
            "component declaration remains intact"
        );
        assert!(
            code.find("__nativeDefineComponent(").unwrap()
                < code.find("export function Counter").unwrap(),
            "registration precedes module work and relies on declaration hoisting"
        );
        assert!(code.contains("__nativeUseStateAt("));
        assert!(code.contains("__nativeUseEffectAt("));
        assert!(
            code.contains("__nativeBindStatePropAt(") || code.contains("__nativeBindStatePropsAt(")
        );
        let components = plan.components.unwrap();
        assert!(
            components
                .iter()
                .find(|component| component.name == "Counter")
                .unwrap()
                .prop_only_sites
                .is_empty(),
            "child text and effect closure reads retain generic owner invalidation"
        );
        assert_eq!(
            components
                .iter()
                .find(|component| component.name == "Badge")
                .unwrap()
                .prop_only_sites
                .len(),
            1,
            "single style-entry-only numeric state is prop-only"
        );
        assert_eq!(response.component_edits.as_ref().unwrap().len(), 9);
        let mut applied = source.to_owned();
        let mut edits = response.component_edits.unwrap();
        edits.sort_by_key(|edit| edit.start);
        for edit in edits.into_iter().rev() {
            let start = utf16_to_byte(&applied, edit.start);
            let end = utf16_to_byte(&applied, edit.end);
            applied.replace_range(start..end, &edit.replacement);
        }
        assert_eq!(code, applied);
    }

    #[test]
    fn rejects_aliased_state_hook_imports_with_source_location() {
        let response = compile_state(
            "native-state-alias.tsx",
            include_str!("../../fixtures/native-state-alias.tsx"),
        );
        assert!(
            response
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-state-alias.tsx:1:")
        );
        assert!(
            response
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("aliases")
        );
    }

    #[test]
    fn rejects_type_only_state_imports_and_composes_task_and_state_modules() {
        let type_only = compile_state(
            "native-state-type-only.tsx",
            include_str!("../../fixtures/native-state-type-only.tsx"),
        );
        assert!(
            type_only
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("native-state-type-only.tsx:1:")
        );
        assert!(
            type_only
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("type-only imports")
        );

        let task_source = include_str!("../../fixtures/native-module-positive.ts");
        let state_source = include_str!("../../fixtures/native-state-positive.tsx");
        let response = compile_native_module(NativeModuleRequest {
            id: "combined".to_owned(),
            path: "native-module-positive.ts".to_owned(),
            source: task_source.to_owned(),
            helper_module: "@runtime/tasks".to_owned(),
            component_module: Some(state_source.to_owned()),
        });
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert_eq!(plan.schema_version, 2);
        assert_eq!(plan.tasks.len(), 2);
        assert_eq!(plan.components.as_ref().unwrap().len(), 2);
        assert!(
            plan.component_module
                .unwrap()
                .contains("__nativeDefineComponent(")
        );
    }

    #[test]
    fn rejects_loop_and_nested_callback_hooks() {
        let loop_hook = compile_state(
            "native-state-loop-hook.tsx",
            include_str!("../../fixtures/native-state-loop-hook.tsx"),
        );
        assert!(
            loop_hook
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("repeated loops or nested callbacks")
        );
        let nested = compile_state(
            "native-state-nested-hook.tsx",
            include_str!("../../fixtures/native-state-nested-hook.tsx"),
        );
        assert!(
            nested
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("repeated loops or nested callbacks")
        );
    }

    #[test]
    fn lowers_authored_use_with_explicit_conditional_sites_and_original_sources() {
        let source = include_str!("../../fixtures/native-store-positive.tsx");
        let response = compile_state("native-store-positive.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.expect("component plan");
        assert_eq!(plan.schema_version, 2);
        let code = plan.component_module.expect("transformed source");
        assert!(code.contains("useAt as __nativeUseAt"));
        assert!(code.contains(
            "__nativeUseAt(\"native-store-positive.tsx#component:StorePanel#store:0\", source)"
        ));
        assert!(code.contains("__nativeUseAt(\"native-store-positive.tsx#component:StorePanel#store:1\", \"global:fallback\")"));
        assert!(code.contains("__nativeUseAt(\"native-store-positive.tsx#component:MultipleStores#store:1\", { key: keyName })"));
        assert!(!code.contains("__nativeUseStoreAt("));
        let components = plan.components.unwrap();
        let store_panel = components
            .iter()
            .find(|component| component.name == "StorePanel")
            .unwrap();
        assert_eq!(store_panel.store_sites.len(), 2);
        assert_eq!(store_panel.store_sites[0].source_expression, "source");
        assert_eq!(
            store_panel.store_sites[1].source_expression,
            "\"global:fallback\""
        );

        let compatibility = compile_state(
            "native-store-compat.tsx",
            include_str!("../../fixtures/native-store-compat.tsx"),
        );
        assert!(compatibility.error.is_none(), "{:?}", compatibility.error);
        assert!(compatibility.plan.unwrap().component_module.unwrap().contains("__nativeUseStoreAt(\"native-store-compat.tsx#component:LegacyStoreReader#store:0\", source)"));

        let state_store = compile_state(
            "native-store-state-prop.tsx",
            include_str!("../../fixtures/native-store-state-prop.tsx"),
        );
        assert!(state_store.error.is_none(), "{:?}", state_store.error);
        let state_plan = state_store.plan.unwrap();
        assert!(state_plan.component_module.unwrap().contains("__nativeUseAt(\"native-store-state-prop.tsx#component:StoreBackedAttribute#store:0\", key)"));
        assert!(
            state_plan.components.unwrap()[0].prop_only_sites.is_empty(),
            "store reads stay on generic owner invalidation"
        );
    }

    #[test]
    fn rejects_unsafe_native_store_imports_ownership_and_arity() {
        for (path, source) in [
            (
                "native-store-alias.tsx",
                include_str!("../../fixtures/native-store-alias.tsx"),
            ),
            (
                "native-store-type-only.tsx",
                include_str!("../../fixtures/native-store-type-only.tsx"),
            ),
            (
                "native-store-type-only-compat.tsx",
                include_str!("../../fixtures/native-store-type-only-compat.tsx"),
            ),
            (
                "native-store-compat-alias.tsx",
                include_str!("../../fixtures/native-store-compat-alias.tsx"),
            ),
        ] {
            let response = compile_state(path, source);
            assert!(
                response
                    .error
                    .as_deref()
                    .unwrap_or_default()
                    .contains("direct named"),
                "{path}: {:?}",
                response.error
            );
        }
        let loop_hook = compile_state(
            "native-store-loop-hook.tsx",
            include_str!("../../fixtures/native-store-loop-hook.tsx"),
        );
        assert!(
            loop_hook
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("repeated loops or nested callbacks")
        );
        let arity = compile_state(
            "native-store-invalid-arity.tsx",
            include_str!("../../fixtures/native-store-invalid-arity.tsx"),
        );
        assert!(
            arity
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("`use` requires exactly one source expression")
        );
    }

    #[test]
    fn compiles_multi_source_attributes_and_style_entries_with_symbol_based_ownership() {
        let response = compile_state(
            "native-state-props.tsx",
            include_str!("../../fixtures/native-state-props.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let components = plan.components.unwrap();
        let component = &components[0];
        assert_eq!(component.prop_only_sites.len(), 2);
        let code = plan.component_module.unwrap();
        assert!(code.contains("__nativeBindStatePropsAt([\"native-state-props.tsx#component:MovingDot#state:0\", \"native-state-props.tsx#component:MovingDot#state:1\"], ([x, y]) => (x + y), __nativeNumericPrograms["), "{code}");
        assert!(code.contains("__nativeBindStatePropsAt([\"native-state-props.tsx#component:MovingDot#state:0\", \"native-state-props.tsx#component:MovingDot#state:1\"], ([x, y]) => (`position ${x + y}`), __nativeNumericPrograms[2])"), "{code}");
        assert!(code.contains("style={{ \"--x\": __nativeBindStatePropAt(\"native-state-props.tsx#component:MovingDot#state:0\", (x) => (x), __nativeNumericPrograms[3]), \"--y\": __nativeBindStatePropAt(\"native-state-props.tsx#component:MovingDot#state:1\", (y) => (y), __nativeNumericPrograms[4])"), "{code}");
        assert!(code.contains("const __nativeNumericPrograms = [{ schemaVersion: 2, ownerProgramId: \"native-state-props.tsx#component:MovingDot\", sinkId: \"native-state-props.tsx#numeric-sink:"));
        assert!(code.contains("sourceSites: [\"native-state-props.tsx#component:MovingDot#state:0\", \"native-state-props.tsx#component:MovingDot#state:1\"] }"));
        assert!(code.contains("propOnlySites: [\"native-state-props.tsx#component:MovingDot#state:0\", \"native-state-props.tsx#component:MovingDot#state:1\"]"));
    }

    #[test]
    fn uses_the_hygienic_binding_helper_alias_for_imports_and_generated_props() {
        let response = compile_state(
            "native-state-alias-collision.tsx",
            include_str!("../../fixtures/native-state-alias-collision.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let code = response.plan.unwrap().component_module.unwrap();
        assert!(code.contains("bindStatePropsAt as __nativeBindStatePropsAt_, renderCollectionAt as __nativeRenderCollectionAt, useAt as __nativeUseAt, bindStatePropAt as __nativeBindStatePropAt }"));
        assert!(code.contains("data-value={__nativeBindStatePropAt(\"native-state-alias-collision.tsx#component:Collision#state:0\", (value) => (value), __nativeNumericPrograms[0])"));
    }

    #[test]
    fn keeps_uncertified_numeric_sources_on_fallback_and_preserves_spans() {
        let source = r#"import { useState } from "native_runtime_api.ts";
export function Counter() {
  const [count] = useState(1);
  const [other] = useState(2);
  let [mutable] = useState(3);
  return <div data-direct={count} data-repeated={count + count} data-compound={count + other} data-unary-template={`count ${count}`} data-compound-template={`total ${count + other}`} data-vector={[count, other]} data-shadow={((count: number) => count)(4)} data-unsupported={Math.abs(count)} data-mutable={mutable} />;
}"#;
        let response = compile_state("native-unary.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let code = plan.component_module.unwrap();
        assert!(code.contains("data-direct={count}"), "{code}");
        assert!(code.contains("data-repeated={count + count}"), "{code}");
        assert!(code.contains("data-compound={count + other}"), "{code}");
        assert!(
            code.contains("data-unary-template={`count ${count}`}"),
            "{code}"
        );
        assert!(
            code.contains("data-compound-template={`total ${count + other}`}"),
            "{code}"
        );
        assert!(code.contains("data-vector={[count, other]}"), "{code}");
        assert!(
            !code.contains("__nativeNumericPrograms"),
            "uncertified source reads remain on fallback: {code}"
        );
        assert!(code.contains("data-shadow={((count: number) => count)(4)}"));
        assert!(code.contains("data-unsupported={Math.abs(count)}"));
        assert!(code.contains("data-mutable={mutable}"));
        assert!(code.contains("propOnlySites: []"), "{code}");

        // The edit records still identify the authored expression boundaries. The Vite
        // plugin uses these offsets to compose the source map back to the TSX source.
        let edits = response.component_edits.unwrap();
        let direct = source.find("data-direct={count}").unwrap() + "data-direct={".len();
        assert!(!edits.iter().any(|edit| edit.start as usize == direct));
    }

    #[test]
    fn singular_helper_alias_is_hygienic_when_the_authored_name_collides() {
        let source = r#"import { useState } from "native_runtime_api.ts";
const __nativeBindStatePropAt = "owned";
export function Counter() { const [value] = useState(1); return <div data-value={value} />; }"#;
        let response = compile_state("native-singular-alias.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let code = response.plan.unwrap().component_module.unwrap();
        assert!(code.contains("bindStatePropAt as __nativeBindStatePropAt_ }"));
        assert!(code.contains("data-value={__nativeBindStatePropAt_(\"native-singular-alias.tsx#component:Counter#state:0\", (value) => (value), __nativeNumericPrograms[0])"));
    }

    #[test]
    fn state_layout_admits_compound_projectors_and_excludes_other_reads() {
        let source = r#"import { useEffect, useState } from "native_runtime_api.ts";
export function Example() {
  const [safe] = useState(1);
  const [x] = useState(2);
  const [y] = useState(3);
  const [outside] = useState(4);
  const [effectRead] = useState(5);
  const observed = outside;
  useEffect(() => { console.log(effectRead); });
  return <div data-safe={safe} data-x={x} data-pair={x + y} data-outside={outside} data-effect={effectRead} />;
}"#;
        let response = compile_state("state-layout-eligibility.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let component = &plan.components.unwrap()[0];
        let prop_sites: BTreeSet<_> = component.prop_only_sites.iter().cloned().collect();
        let state_layout = component
            .state_layout
            .as_ref()
            .expect("safe unary site should have a layout");
        assert_eq!(state_layout.schema_version, 1);
        assert_eq!(state_layout.slots.len(), 3);
        assert_eq!(
            state_layout.slots[0].site_id,
            "state-layout-eligibility.tsx#component:Example#state:0"
        );
        assert_eq!(state_layout.slots[0].slot, 0);
        assert_eq!(
            state_layout.slots[1].site_id,
            "state-layout-eligibility.tsx#component:Example#state:1"
        );
        assert_eq!(state_layout.slots[1].slot, 1);
        assert_eq!(
            state_layout.slots[2].site_id,
            "state-layout-eligibility.tsx#component:Example#state:2"
        );
        assert_eq!(state_layout.slots[2].slot, 2);
        assert!(prop_sites.contains("state-layout-eligibility.tsx#component:Example#state:0"));
        assert!(prop_sites.contains("state-layout-eligibility.tsx#component:Example#state:1"));
        assert!(prop_sites.contains("state-layout-eligibility.tsx#component:Example#state:2"));
        assert!(!prop_sites.contains("state-layout-eligibility.tsx#component:Example#state:3"));
        assert!(!prop_sites.contains("state-layout-eligibility.tsx#component:Example#state:4"));
        let code = plan.component_module.unwrap();
        assert!(code.contains("stateLayout: { schemaVersion: 1, programId: \"state-layout-eligibility.tsx#component:Example\", slots: [{ siteId: \"state-layout-eligibility.tsx#component:Example#state:0\", slot: 0 }, { siteId: \"state-layout-eligibility.tsx#component:Example#state:1\", slot: 1 }, { siteId: \"state-layout-eligibility.tsx#component:Example#state:2\", slot: 2 }] }"));
        assert!(code.contains("sourceSites: [\"state-layout-eligibility.tsx#component:Example#state:1\", \"state-layout-eligibility.tsx#component:Example#state:2\"] }"), "{code}");
    }

    #[test]
    fn owner_program_layout_covers_vector_and_repeated_numeric_reads_in_slot_order() {
        let response = compile_state(
            "native-owner-row-program.tsx",
            include_str!("../../fixtures/native-owner-row-program.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let component = &plan.components.as_ref().unwrap()[0];
        let layout = component
            .state_layout
            .as_ref()
            .expect("all three numeric slots are eligible");
        assert_eq!(layout.schema_version, 1);
        assert_eq!(
            layout.program_id.as_deref(),
            Some("native-owner-row-program.tsx#component:Row")
        );
        assert_eq!(
            layout
                .slots
                .iter()
                .map(|slot| slot.site_id.as_str())
                .collect::<Vec<_>>(),
            vec![
                "native-owner-row-program.tsx#component:Row#state:0",
                "native-owner-row-program.tsx#component:Row#state:1",
                "native-owner-row-program.tsx#component:Row#state:2",
            ]
        );

        let code = plan.component_module.unwrap();
        assert!(code.contains("stateLayout: { schemaVersion: 1, programId: \"native-owner-row-program.tsx#component:Row\""), "{code}");
        assert!(code.contains("position={__nativeBindStatePropsAt([\"native-owner-row-program.tsx#component:Row#state:0\", \"native-owner-row-program.tsx#component:Row#state:1\", \"native-owner-row-program.tsx#component:Row#state:2\"], ([x, y, z]) => ([z, x, y]), __nativeNumericPrograms[0])}"), "{code}");
        assert!(code.contains("data-repeat={__nativeBindStatePropAt(\"native-owner-row-program.tsx#component:Row#state:0\", (x) => (x + x), __nativeNumericPrograms[1])}"), "{code}");
        assert!(code.contains("schemaVersion: 2, ownerProgramId: \"native-owner-row-program.tsx#component:Row\", sinkId:"), "{code}");

        let outside = compile_state(
            "owner-program-outside-read.tsx",
            "import { useState } from \"native_runtime_api.ts\"; export function Row() { const [x] = useState(1); const copy = x; return <div data-x={x} />; }",
        );
        assert!(outside.error.is_none(), "{:?}", outside.error);
        let outside = outside.plan.unwrap();
        assert!(
            outside.components.as_ref().unwrap()[0]
                .state_layout
                .is_none()
        );
        assert!(
            !outside
                .component_module
                .unwrap()
                .contains("__nativeNumericPrograms")
        );

        let impure = compile_state(
            "owner-program-unknown-call.tsx",
            "import { useState } from \"native_runtime_api.ts\"; export function Row() { const [x] = useState(1); return <div data-direct={x} data-x={Math.abs(x)} />; }",
        );
        assert!(impure.error.is_none(), "{:?}", impure.error);
        let impure = impure.plan.unwrap();
        assert!(
            impure.components.as_ref().unwrap()[0]
                .state_layout
                .is_none()
        );
        assert!(
            !impure
                .component_module
                .unwrap()
                .contains("__nativeNumericPrograms")
        );

        let mixed = compile_state(
            "owner-program-mixed-numeric.tsx",
            "import { useState } from \"native_runtime_api.ts\"; export function Row() { const [x] = useState(1); const [label] = useState(\"one\"); return <div data-pair={x + label} data-x={x} />; }",
        );
        assert!(mixed.error.is_none(), "{:?}", mixed.error);
        let mixed = mixed.plan.unwrap();
        assert!(mixed.components.as_ref().unwrap()[0].state_layout.is_none());
        let mixed_code = mixed.component_module.unwrap();
        assert!(mixed_code.contains("data-pair={x + label}"), "{mixed_code}");
        assert!(mixed_code.contains("data-x={x}"), "{mixed_code}");
        assert!(
            !mixed_code.contains("__nativeNumericPrograms"),
            "{mixed_code}"
        );

        let same_shape = compile_state(
            "owner-program-two-components.tsx",
            "import { useState } from \"native_runtime_api.ts\"; export function First() { const [value] = useState(1); return <mesh data-value={value} />; } export function Second() { const [value] = useState(2); return <mesh data-value={value} />; }",
        );
        assert!(same_shape.error.is_none(), "{:?}", same_shape.error);
        let same_shape = same_shape.plan.unwrap();
        let components = same_shape.components.as_ref().unwrap();
        assert_eq!(components.len(), 2);
        assert_eq!(
            components[0]
                .state_layout
                .as_ref()
                .unwrap()
                .program_id
                .as_deref(),
            Some("owner-program-two-components.tsx#component:First")
        );
        assert_eq!(
            components[1]
                .state_layout
                .as_ref()
                .unwrap()
                .program_id
                .as_deref(),
            Some("owner-program-two-components.tsx#component:Second")
        );
        let same_shape_code = same_shape.component_module.unwrap();
        assert!(same_shape_code.contains("schemaVersion: 2, ownerProgramId: \"owner-program-two-components.tsx#component:First\""), "{same_shape_code}");
        assert!(same_shape_code.contains("schemaVersion: 2, ownerProgramId: \"owner-program-two-components.tsx#component:Second\""), "{same_shape_code}");
    }

    #[test]
    fn state_layout_slots_keep_conditional_hook_site_ids_and_dense_order() {
        let source = r#"import { useState } from "native_runtime_api.ts";
export function Conditional({ enabled }: { enabled: boolean }) {
  if (enabled) { const [conditional] = useState(10); void conditional; }
  const [later] = useState(20);
  return <div data-later={later} />;
}"#;
        let first = compile_state("state-layout-conditional.tsx", source);
        let second = compile_state("state-layout-conditional.tsx", source);
        assert!(first.error.is_none(), "{:?}", first.error);
        assert!(second.error.is_none(), "{:?}", second.error);
        let first_plan = first.plan.unwrap();
        let second_plan = second.plan.unwrap();
        let first_layout = first_plan.components.as_ref().unwrap()[0]
            .state_layout
            .as_ref()
            .unwrap();
        let second_layout = second_plan.components.as_ref().unwrap()[0]
            .state_layout
            .as_ref()
            .unwrap();
        assert_eq!(first_layout.slots.len(), 1);
        assert_eq!(
            first_layout.slots[0].site_id,
            "state-layout-conditional.tsx#component:Conditional#state:1"
        );
        assert_eq!(first_layout.slots[0].slot, 0);
        assert_eq!(
            first_layout.slots[0].site_id,
            second_layout.slots[0].site_id
        );
        assert_eq!(first_layout.slots[0].slot, second_layout.slots[0].slot);

        let mut declarations = String::new();
        let mut props = String::new();
        for index in 0..12 {
            declarations.push_str(&format!("const [v{index}] = useState({index});"));
            props.push_str(&format!(" data-v{index}={{v{index}}}"));
        }
        let many = format!(
            "import {{ useState }} from \"native_runtime_api.ts\"; export function Many() {{ {declarations} return <div{props} />; }}"
        );
        let response = compile_state("state-layout-many.tsx", &many);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let component = &plan.components.as_ref().unwrap()[0];
        let slots = &component.state_layout.as_ref().unwrap().slots;
        assert_eq!(slots.len(), 12);
        for (index, slot) in slots.iter().enumerate() {
            assert_eq!(slot.slot, index);
            assert_eq!(
                slot.site_id,
                format!("state-layout-many.tsx#component:Many#state:{index}")
            );
        }
        assert_eq!(
            slots[2].site_id,
            "state-layout-many.tsx#component:Many#state:2"
        );
        assert_eq!(
            slots[10].site_id,
            "state-layout-many.tsx#component:Many#state:10"
        );
    }

    #[test]
    fn state_layout_metadata_is_hygienic_omitted_when_empty_and_covers_product_unary_sinks() {
        let collision = r#"import { useState } from "native_runtime_api.ts";
const __nativeDefineComponent = "authored";
const stateLayout = "authored";
export function Collision() { const [x] = useState(0); return <div style={{ left: `${x}px` }} />; }"#;
        let response = compile_state("state-layout-collision.tsx", collision);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert_eq!(
            plan.components.as_ref().unwrap()[0]
                .state_layout
                .as_ref()
                .unwrap()
                .slots
                .len(),
            1
        );
        let code = plan.component_module.unwrap();
        assert!(
            code.contains("defineComponent as __nativeDefineComponent_"),
            "{code}"
        );
        assert!(code.contains("stateLayout: { schemaVersion: 1, programId: \"state-layout-collision.tsx#component:Collision\", slots: [{ siteId: \"state-layout-collision.tsx#component:Collision#state:0\", slot: 0 }] }"));

        let repeated_read = compile_state(
            "state-layout-empty.tsx",
            "import { useState } from \"native_runtime_api.ts\"; export function Empty() { const [x] = useState(0); return <div data-pair={x + x} />; }",
        );
        assert!(repeated_read.error.is_none(), "{:?}", repeated_read.error);
        let repeated_read = repeated_read.plan.unwrap();
        let repeated_component = &repeated_read.components.as_ref().unwrap()[0];
        assert_eq!(
            repeated_component
                .state_layout
                .as_ref()
                .unwrap()
                .slots
                .len(),
            1
        );
        let repeated_code = repeated_read.component_module.unwrap();
        assert!(repeated_code.contains("stateLayout: { schemaVersion: 1, programId: \"state-layout-empty.tsx#component:Empty\", slots: [{ siteId: \"state-layout-empty.tsx#component:Empty#state:0\", slot: 0 }] }"));
        assert!(repeated_code.contains(
            "schemaVersion: 2, ownerProgramId: \"state-layout-empty.tsx#component:Empty\", sinkId:"
        ));

        let product_source = include_str!("../../../src/browser/native_product_mixed_arm.tsx");
        let product = compile_state("src/browser/native_product_mixed_arm.tsx", product_source);
        assert!(product.error.is_none(), "{:?}", product.error);
        let product = product.plan.unwrap();
        let row = product
            .components
            .as_ref()
            .unwrap()
            .iter()
            .find(|component| component.name == "ProductMixedRow")
            .expect("ordinary product TSX row component");
        let slots = &row.state_layout.as_ref().unwrap().slots;
        assert_eq!(slots.len(), 3);
        for (index, slot) in slots.iter().enumerate() {
            assert_eq!(slot.slot, index);
            assert_eq!(
                slot.site_id,
                format!(
                    "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:{index}"
                )
            );
        }
        let code = product.component_module.unwrap();
        assert_eq!(
            code.matches("sinkId: \"src/browser/native_product_mixed_arm.tsx#numeric-sink:")
                .count(),
            3
        );
    }

    #[test]
    fn non_numeric_state_still_uses_the_general_owner_read_path() {
        let source = r#"import { useState } from "native_runtime_api.ts";
export function Label() { const [label] = useState("ready"); return <span data-label={label} />; }"#;
        let response = compile_state("native-unary-string.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let code = plan.component_module.unwrap();
        assert!(code.contains("data-label={label}"));
        assert!(!code.contains("bindStatePropAt(\"native-unary-string.tsx"));
        assert!(!code.contains("__nativeNumericPrograms"));
        assert!(plan.components.unwrap()[0].prop_only_sites.is_empty());
    }

    #[test]
    fn does_not_infer_numeric_state_from_numeric_named_bindings() {
        let response = compile_state(
            "native-state-nonnumeric-initializer.tsx",
            include_str!("../../fixtures/native-state-nonnumeric-initializer.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert!(plan.components.unwrap()[0].prop_only_sites.is_empty());
        let code = plan.component_module.unwrap();
        assert!(!code.contains("=> (value))"));
        assert!(!code.contains("__nativeNumericPrograms"));
    }

    #[test]
    fn numeric_program_sources_follow_the_binding_parameter_order_and_alias_is_hygienic() {
        let mut declarations = String::new();
        let mut props = String::new();
        for index in 0..11 {
            declarations.push_str(&format!("const [v{index}] = useState({index});"));
        }
        for index in 0..11 {
            props.push_str(&format!(" data-v{index}={{v{index}}}"));
        }
        let source = format!(
            "import {{ useState }} from \"native_runtime_api.ts\"; const __nativeNumericPrograms = 'owned'; export function Counter() {{ {declarations} return <div{props} data-pair={{v2 + v10}} />; }}"
        );
        let response = compile_state("numeric-order.tsx", &source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let code = response.plan.unwrap().component_module.unwrap();
        assert!(
            code.contains("const __nativeNumericPrograms_ = ["),
            "{code}"
        );
        assert!(code.contains("data-pair={__nativeBindStatePropsAt([\"numeric-order.tsx#component:Counter#state:2\", \"numeric-order.tsx#component:Counter#state:10\"], ([v2, v10]) => (v2 + v10), __nativeNumericPrograms_[11])}"), "{code}");
        assert!(
            code.contains(
                "schemaVersion: 2, ownerProgramId: \"numeric-order.tsx#component:Counter\", sinkId:"
            ),
            "{code}"
        );
        assert!(code.contains("sourceSites: [\"numeric-order.tsx#component:Counter#state:2\", \"numeric-order.tsx#component:Counter#state:10\"] }"), "{code}");
    }

    #[test]
    fn compiles_public_package_runtime_imports() {
        for module in ["@compiled-ui/runtime", "@compiled-ui/runtime/core"] {
            let source = format!(
                "import {{ useState }} from \"{module}\";\nexport function Counter() {{ const [count, setCount] = useState(0); return <button onClick={{() => setCount(value => value + 1)}}>{{count}}</button>; }}"
            );
            let response = compile_state("package-counter.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let code = response.plan.unwrap().component_module.unwrap();
            assert!(code.contains("__nativeUseStateAt"));
            assert!(code.contains(module));
        }
        assert!(!is_native_runtime_module("@compiled-ui/runtime/react"));
        assert!(!is_native_runtime_module("react"));
    }

    #[test]
    fn compiles_stateless_native_components_and_reports_unsupported_hook_component_forms() {
        let stateless = include_str!("../../fixtures/native-state-stateless.tsx");
        let response = compile_state("native-state-stateless.tsx", stateless);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert_eq!(plan.schema_version, 2);
        let metadata = plan.components.unwrap();
        assert_eq!(metadata.len(), 1);
        assert!(metadata[0].state_sites.is_empty());
        assert!(metadata[0].effect_sites.is_empty());
        assert!(metadata[0].prop_only_sites.is_empty());
        let code = plan.component_module.unwrap();
        assert!(code.contains("defineComponent as __nativeDefineComponent"));
        assert!(code.contains("__nativeDefineComponent(\"native-state-stateless.tsx#component:App\", App, { propOnlySites: [], hostLeafOutput: true })"));
        assert!(metadata[0].host_leaf_output);
        assert!(code.contains("from \"native_runtime_api.ts\";"));

        for (fixture, label) in [
            ("native-state-async-component.tsx", "async components"),
            ("native-state-arrow-component.tsx", "arrow components"),
        ] {
            let source = match fixture {
                "native-state-async-component.tsx" => {
                    include_str!("../../fixtures/native-state-async-component.tsx")
                }
                _ => include_str!("../../fixtures/native-state-arrow-component.tsx"),
            };
            let error = compile_state(fixture, source)
                .error
                .expect("unsupported hook component form must be rejected");
            assert!(error.starts_with(&format!("{fixture}:")), "{error}");
            assert!(error.contains(label), "{error}");
        }
    }

    #[test]
    fn emits_host_leaf_hint_only_for_stable_intrinsic_roots_and_primitive_children() {
        let source = r#"
import { createStore, use, useState } from "native_runtime_api.ts";
const countStore = createStore(3);
export function Bare() { return <output />; }
export function StoreText() {
  const value = use(countStore);
  return <output>{value}</output>;
}
export function ArithmeticText() {
  const value = use(countStore);
  return <output>{`${String(value + 1)}`}</output>;
}
function Leaf() { return <span />; }
export function NestedComponent() {
  const [show] = useState(false);
  return show ? <div /> : <Leaf />;
}
export function NullableRoot() {
  const [show] = useState(false);
  return show ? <div /> : null;
}
export function ChangedTag() {
  const [show] = useState(false);
  return show ? <div /> : <span />;
}
export function ChangedKey() {
  const [show] = useState(false);
  return show ? <div key="left" /> : <div key="right" />;
}
export function DynamicKey({ id }) { return <div key={id} />; }
export function UnknownChild({ children }) { return <div>{children}</div>; }
export function CallbackChild() { return <div>{makeChild()}</div>; }
export function FragmentRoot() { return <><div /></>; }
export function ConditionalIntrinsic() {
  const [show] = useState(false);
  const value = use(countStore);
  return show ? <div><b>{`count ${value}`}</b></div> : <div><b>empty</b></div>;
}
"#;
        let response = compile_state("native-host-leaf.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let components = plan.components.unwrap();
        let hint = |name: &str| {
            components
                .iter()
                .find(|component| component.name == name)
                .unwrap_or_else(|| panic!("missing component {name}"))
                .host_leaf_output
        };
        for name in [
            "Bare",
            "StoreText",
            "ArithmeticText",
            "ConditionalIntrinsic",
        ] {
            assert!(hint(name), "{name} should have a host-leaf hint");
        }
        for name in [
            "NestedComponent",
            "NullableRoot",
            "ChangedTag",
            "ChangedKey",
            "DynamicKey",
            "UnknownChild",
            "CallbackChild",
            "FragmentRoot",
        ] {
            assert!(!hint(name), "{name} must stay on generic owner traversal");
        }
        let code = plan.component_module.unwrap();
        assert!(code.contains("Bare, { propOnlySites: [], hostLeafOutput: true })"));
        assert!(code.contains("StoreText, { propOnlySites: [], hostLeafOutput: true })"));
        assert!(code.contains("NestedComponent, { propOnlySites: [] })"));
    }

    #[test]
    fn recognizes_only_resolved_native_keyed_collection_prop_types() {
        let positive = compile_state(
            "typed-keyed-collection.tsx",
            r#"
import { createDOMRoot } from "@compiled-ui/runtime/core";
import type { KeyedCollection as NativeRows } from "@compiled-ui/runtime/core";
type Row = { id: number };
export function Board({ items, records }: { items: NativeRows<Row>; records: NativeRows<Row> }) {
  const rowsAlias = items;
  return <ul>{rowsAlias.map((row) => (<li key={row.id} />))}{records.map((row) => <li key={row.id} />)}</ul>;
}
"#,
        );
        assert!(positive.error.is_none(), "{:?}", positive.error);
        let positive = positive.plan.unwrap();
        let component = positive
            .components
            .as_ref()
            .unwrap()
            .iter()
            .find(|component| component.name == "Board")
            .unwrap();
        assert_eq!(component.collection_sites.len(), 2);
        assert!(
            component
                .collection_sites
                .iter()
                .all(|site| !site.requires_owner_render)
        );
        let component_module = positive.component_module.unwrap();
        assert!(component_module.contains(
            "__nativeRenderCollectionAt(\"typed-keyed-collection.tsx#component:Board#collection:0\", rowsAlias"
        ));
        assert!(component_module.contains(
            "__nativeRenderCollectionAt(\"typed-keyed-collection.tsx#component:Board#collection:1\", records"
        ));

        for (name, prop_type, imports, body) in [
            (
                "foreign-type",
                "KeyedCollection<Row>",
                "import type { KeyedCollection } from './foreign_runtime.ts';",
                "return <ul>{rows.map((row) => <li key={row.id} />)}</ul>;",
            ),
            (
                "local-shadow",
                "KeyedCollection<Row>",
                "import type { KeyedCollection as NativeRows } from '@compiled-ui/runtime/core'; type KeyedCollection<T> = readonly T[];",
                "return <ul>{rows.map((row) => <li key={row.id} />)}</ul>;",
            ),
            (
                "array",
                "Row[]",
                "import type { KeyedCollection } from '@compiled-ui/runtime/core';",
                "return <ul>{rows.map((row) => <li key={row.id} />)}</ul>;",
            ),
            (
                "reassigned",
                "KeyedCollection<Row>",
                "import type { KeyedCollection } from '@compiled-ui/runtime/core';",
                "rows = rows; return <ul>{rows.map((row) => <li key={row.id} />)}</ul>;",
            ),
        ] {
            let source = format!(
                "import {{ createDOMRoot }} from '@compiled-ui/runtime/core'; {imports} type Row = {{ id: number }}; export function Board({{ rows }}: {{ rows: {prop_type} }}) {{ {body} }}"
            );
            let response = compile_state(&format!("typed-keyed-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let component = response
                .plan
                .unwrap()
                .components
                .unwrap()
                .into_iter()
                .find(|component| component.name == "Board")
                .unwrap();
            assert!(
                component.collection_sites.is_empty(),
                "{name} must remain generic"
            );
        }
    }

    #[test]
    fn optimizes_only_moving_dot_numeric_cells_in_the_real_native_demo() {
        let source = include_str!("../../../src/browser/native_state_props.tsx");
        let response = compile_state("src/browser/native_state_props.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let moving = plan
            .components
            .as_ref()
            .unwrap()
            .iter()
            .find(|component| component.name == "MovingDot")
            .unwrap();
        assert_eq!(
            moving.prop_only_sites.len(),
            3,
            "x/y/tint feed only numeric props; moving remains generic due to branch/text reads"
        );
        let code = plan.component_module.unwrap();
        assert!(code.contains("__nativeBindStatePropAt(\"src/browser/native_state_props.tsx#component:MovingDot#state:0\", (x) => (x), __nativeNumericPrograms["));
        assert!(code.contains("__nativeBindStatePropAt(\"src/browser/native_state_props.tsx#component:MovingDot#state:1\", (y) => (y), __nativeNumericPrograms["));
        assert!(code.contains("__nativeBindStatePropAt(\"src/browser/native_state_props.tsx#component:MovingDot#state:2\", (tint) => (tint), __nativeNumericPrograms["));
    }

    #[test]
    fn key_and_custom_component_props_keep_generic_owner_reads() {
        let response = compile_state(
            "native-state-key-custom-sinks.tsx",
            include_str!("../../fixtures/native-state-key-custom-sinks.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        for name in ["KeyOwner", "CustomOwner"] {
            assert!(
                plan.components
                    .as_ref()
                    .unwrap()
                    .iter()
                    .find(|component| component.name == name)
                    .unwrap()
                    .prop_only_sites
                    .is_empty()
            );
        }
        let code = plan.component_module.unwrap();
        assert!(!code.contains("__nativeBindStatePropsAt("));
    }

    #[test]
    fn rejects_nested_component_registration_scope() {
        let response = compile_state(
            "native-state-nested-component.tsx",
            include_str!("../../fixtures/native-state-nested-component.tsx"),
        );
        assert!(
            response
                .error
                .as_deref()
                .unwrap_or_default()
                .contains("nested capitalized function components")
        );
    }
}
