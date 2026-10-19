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
        Argument, ArrayExpressionElement, ArrowFunctionBody, ArrowFunctionExpression,
        BindingPattern, CallExpression, Declaration, Expression,
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

mod owner_update_program;
mod semantic_plan;
use semantic_plan::{SemanticPlan, build_semantic_plan, module_revision};
use owner_update_program::{Sink, StateReference, emit_owner_update_program, primitive_output_expression};
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
    module_revision: String,
    semantic_plan: SemanticPlan,
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
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    numeric_primitive_props: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    state_layout: Option<NativeStateLayoutMetadata>,
    host_leaf_output: bool,
    state_sites: Vec<NativeStateSiteMetadata>,
    effect_sites: Vec<NativeEffectSiteMetadata>,
    store_sites: Vec<NativeStoreSiteMetadata>,
    #[serde(rename = "closedResourceHostProgram", skip_serializing_if = "Option::is_none")]
    closed_resource_host_program: Option<serde_json::Value>,
    #[serde(rename = "closedStoreHostProgram", skip_serializing_if = "Option::is_none")]
    closed_store_host_program: Option<serde_json::Value>,
    #[serde(rename = "closedComponentForwardProgram", skip_serializing_if = "Option::is_none")]
    closed_component_forward_program: Option<serde_json::Value>,
    #[serde(default)]
    collection_sites: Vec<NativeCollectionSiteMetadata>,
    #[serde(rename = "closedCollectionSites", default, skip_serializing_if = "Vec::is_empty")]
    closed_collection_sites: Vec<String>,
    numeric_sinks: Vec<NativeNumericSinkMetadata>,
    opaque_sinks: Vec<String>,
}

#[derive(Debug, Serialize)]
struct NativeNumericSinkMetadata {
    sink_id: String,
    source_sites: Vec<String>,
    primitive_value: bool,
}

#[derive(Debug, Serialize)]
struct NativeStateLayoutMetadata {
    schema_version: u32,
    #[serde(rename = "programId", skip_serializing_if = "Option::is_none")]
    program_id: Option<String>,
    #[serde(rename = "moduleRevision")]
    module_revision: String,
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
    state_reference_sites: BTreeMap<(u32, u32), String>,
    derived_reference_sites: BTreeMap<(u32, u32), SymbolId>,
    expanded: Option<ExpandedNativeExpression>,
    other_refs: bool,
}

#[derive(Clone)]
struct NativeDerivedLocal {
    owner_program_id: String,
    reserved_identifier: bool,
    declaration_start: u32,
    initializer_span: SourceSpan,
    initializer_references: Vec<(u32, u32, Option<SymbolId>)>,
    initializer_syntax_supported: bool,
    initializer_node_count: usize,
}

#[derive(Clone)]
struct ExpandedNativeExpression {
    source: String,
    state_refs: BTreeSet<SymbolId>,
    references: Vec<StateReference>,
    derived_refs: BTreeSet<SymbolId>,
    expanded_node_count: usize,
}

const MAX_DERIVED_LOCAL_EXPANSION_BYTES: usize = 4096;
const MAX_DERIVED_LOCAL_EXPANSION_NODES: usize = 2048;
const MAX_DERIVED_LOCAL_EXPANSION_DEPTH: usize = 64;
const MAX_OWNER_DERIVED_EXPANSION_BYTES: usize = 16 * 1024;
const MAX_OWNER_DERIVED_EXPANSION_NODES: usize = 8192;

#[derive(Default)]
struct ExpressionNodeCounter(usize);

impl<'a> Visit<'a> for ExpressionNodeCounter {
    fn visit_expression(&mut self, node: &Expression<'a>) {
        self.0 = self.0.saturating_add(1);
        walk::walk_expression(self, node);
    }
}

struct NativeDerivedLocalCollector<'p, 'a> {
    components: &'p [ComponentStateSiteIr],
    semantic: &'p Semantic<'a>,
    locals: BTreeMap<SymbolId, NativeDerivedLocal>,
}

fn collect_native_derived_locals<'a>(
    statements: &[Statement<'a>], component: &ComponentStateSiteIr,
    semantic: &Semantic<'a>, locals: &mut BTreeMap<SymbolId, NativeDerivedLocal>,
) {
    for statement in statements {
        let Some(Declaration::VariableDeclaration(declaration)) = statement.as_declaration() else {
            continue;
        };
        if declaration.kind != oxc_ast::ast::VariableDeclarationKind::Const { continue; }
        for declarator in &declaration.declarations {
            let (BindingPattern::BindingIdentifier(identifier), Some(initializer)) =
                (&declarator.id, declarator.init.as_ref()) else { continue; };
            let Some(symbol) = identifier.symbol_id.get() else { continue; };
            let mut reference_collector = ExpressionReferenceCollector {
                semantic, references: Vec::new(),
            };
            reference_collector.visit_expression(initializer);
            let initializer_syntax_supported = owner_update_program::visit_closed_primitive_expression(
                initializer, owner_update_program::ClosedExpressionPolicy::Primitive,
                &mut |_| true,
            ) && !matches!(identifier.name.as_str(), "undefined" | "NaN" | "Infinity");
            let mut node_counter = ExpressionNodeCounter::default();
            node_counter.visit_expression(initializer);
            locals.insert(symbol, NativeDerivedLocal {
                owner_program_id: component.component_site_id.clone(),
                reserved_identifier: matches!(identifier.name.as_str(), "undefined" | "NaN" | "Infinity"),
                declaration_start: declarator.span.start,
                initializer_span: span(initializer.span().start, initializer.span().end),
                initializer_references: reference_collector.references,
                initializer_syntax_supported,
                initializer_node_count: node_counter.0,
            });
        }
    }
}

impl<'a> Visit<'a> for NativeDerivedLocalCollector<'_, 'a> {
    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        let component = self.components.iter().find(|component| {
            component.arrow_initializer.is_none() && component.declaration.start == node.span.start
                && component.declaration.end == node.span.end
        });
        if let (Some(component), Some(body)) = (component, node.body.as_ref()) {
            collect_native_derived_locals(&body.statements, component, self.semantic, &mut self.locals);
        }
        walk::walk_function(self, node, flags);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
            && let ArrowFunctionBody::FunctionBody(body) = &arrow.body
            && let Some(component) = self.components.iter().find(|component|
                component.arrow_initializer.as_ref().is_some_and(|at|
                    at.start == arrow.span.start && at.end == arrow.span.end))
        {
            collect_native_derived_locals(&body.statements, component, self.semantic, &mut self.locals);
        }
        walk::walk_variable_declarator(self, node);
    }
}

struct NativeStateUsageCollector<'s, 'a> {
    semantic: &'s Semantic<'a>,
    call_sites: BTreeMap<(u32, u32), String>,
    bindings: BTreeMap<SymbolId, NativeStateBinding>,
    derived_locals: BTreeMap<SymbolId, NativeDerivedLocal>,
    setter_symbols: BTreeSet<SymbolId>,
    current_declaration_is_const: bool,
    candidates: Vec<NativePropCandidate>,
    components: &'s [ComponentStateSiteIr],
    source: &'s str,
    intrinsic_opening: Vec<bool>,
    outside_state_reads: BTreeSet<String>,
    derived_initializer_state_reads: Vec<(SymbolId, SymbolId, String)>,
    derived_initializer_reads: Vec<(SymbolId, SymbolId)>,
    outside_derived_reads: BTreeSet<SymbolId>,
    derived_expansion_totals: BTreeMap<String, (usize, usize)>,
    over_budget_owners: BTreeSet<String>,
    numeric_sites: BTreeSet<String>,
}

impl<'s, 'a> NativeStateUsageCollector<'s, 'a> {
    fn candidate(
        &mut self,
        candidate_span: SourceSpan,
        expression: &Expression<'a>,
    ) -> NativePropCandidate {
        let mut references = ExpressionReferenceCollector {
            semantic: self.semantic,
            references: Vec::new(),
        };
        references.visit_expression(expression);
        let expression_references = references.references;
        let expression_syntax_supported = owner_update_program::visit_closed_primitive_expression(
            expression,
            owner_update_program::ClosedExpressionPolicy::PrimitiveOrArray,
            &mut |_| true,
        );
        let mut node_counter = ExpressionNodeCounter::default();
        node_counter.visit_expression(expression);
        let expression_node_count = node_counter.0;
        let derived_reference_sites: BTreeMap<_, _> = expression_references
            .iter()
            .filter_map(|(start, end, symbol)| {
                symbol
                    .filter(|symbol| self.derived_locals.contains_key(symbol))
                    .map(|symbol| ((*start, *end), symbol))
            })
            .collect();
        let roots: BTreeSet<_> = derived_reference_sites.values().copied().collect();
        let owner_program_id = self
            .components
            .iter()
            .find(|component| {
                component.declaration.start <= candidate_span.start
                    && candidate_span.end <= component.declaration.end
            })
            .map(|component| component.component_site_id.clone());
        let mut expanded_node_count = expression_node_count;
        let mut expanded = if roots.is_empty()
            || owner_program_id
                .as_ref()
                .is_some_and(|owner| self.over_budget_owners.contains(owner))
        {
            None
        } else {
            owner_program_id.as_ref().and_then(|owner_program_id| {
                expand_native_expression(
                    self.source,
                    &candidate_span,
                    &expression_references,
                    expression_syntax_supported,
                    owner_program_id,
                    candidate_span.start,
                    &self.bindings,
                    &self.derived_locals,
                    &mut BTreeSet::new(),
                    &mut expanded_node_count,
                )
            })
        };
        if let (Some(expanded_expression), Some(owner_id)) = (expanded.as_ref(), owner_program_id)
            && !expanded_expression.state_refs.is_empty()
        {
            let total = self
                .derived_expansion_totals
                .entry(owner_id.clone())
                .or_default();
            total.0 = total.0.saturating_add(expanded_expression.source.len());
            total.1 = total
                .1
                .saturating_add(expanded_expression.expanded_node_count);
            if total.0 > MAX_OWNER_DERIVED_EXPANSION_BYTES
                || total.1 > MAX_OWNER_DERIVED_EXPANSION_NODES
            {
                self.over_budget_owners.insert(owner_id);
                expanded = None;
            }
        }
        NativePropCandidate {
            span: candidate_span,
            state_refs: BTreeSet::new(),
            state_reference_sites: BTreeMap::new(),
            derived_reference_sites,
            expanded,
            other_refs: false,
        }
    }
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
    #[serde(skip)]
    arrow_initializer: Option<SourceSpan>,
    #[serde(skip)]
    arrow_body_start: Option<u32>,
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
    current_declaration_is_single: bool,
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
    unsupported_arrow_components: BTreeMap<SymbolId, (SourceSpan, &'static str, String)>,
    jsx_component_references: BTreeSet<SymbolId>,
    arrow_component_stack: Vec<(SourceSpan, &'static str)>,
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
                                        let candidate = self.candidate(
                                            span(
                                                property.value.span().start,
                                                property.value.span().end,
                                            ),
                                            &property.value,
                                        );
                                        self.candidates.push(candidate);
                                    }
                                }
                            }
                        }
                    } else {
                        let candidate = self.candidate(
                            span(expression.span().start, expression.span().end),
                            expression,
                        );
                        self.candidates.push(candidate);
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
                    candidate
                        .state_reference_sites
                        .insert((node.span.start, node.span.end), binding.site_id.clone());
                } else if let Some((derived_symbol, local)) =
                    self.derived_locals.iter().find(|(_, local)| {
                        local.initializer_span.start <= node.span.start
                            && local.initializer_span.end >= node.span.end
                    })
                {
                    if local.initializer_syntax_supported {
                        self.derived_initializer_state_reads.push((
                            *derived_symbol,
                            symbol,
                            binding.site_id.clone(),
                        ));
                    } else {
                        self.outside_state_reads.insert(binding.site_id.clone());
                    }
                } else {
                    self.outside_state_reads.insert(binding.site_id.clone());
                }
            } else if self.derived_locals.contains_key(&symbol) {
                if let Some(candidate) = self.candidates.iter_mut().find(|candidate| {
                    candidate.span.start <= node.span.start && candidate.span.end >= node.span.end
                }) {
                    candidate
                        .derived_reference_sites
                        .insert((node.span.start, node.span.end), symbol);
                } else if let Some((derived_symbol, local)) =
                    self.derived_locals.iter().find(|(_, local)| {
                        local.initializer_span.start <= node.span.start
                            && local.initializer_span.end >= node.span.end
                    })
                {
                    if local.initializer_syntax_supported {
                        self.derived_initializer_reads
                            .push((*derived_symbol, symbol));
                    } else {
                        self.outside_derived_reads.insert(symbol);
                    }
                } else {
                    self.outside_derived_reads.insert(symbol);
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

struct ExpressionReferenceCollector<'s, 'a> {
    semantic: &'s Semantic<'a>,
    references: Vec<(u32, u32, Option<SymbolId>)>,
}

impl<'a> Visit<'a> for ExpressionReferenceCollector<'_, 'a> {
    fn visit_identifier_reference(&mut self, node: &oxc_ast::ast::IdentifierReference<'a>) {
        self.references.push((
            node.span.start,
            node.span.end,
            reference_symbol(node, self.semantic),
        ));
    }
}

fn expand_native_expression(
    source: &str,
    expression_span: &SourceSpan,
    expression_references: &[(u32, u32, Option<SymbolId>)],
    syntax_supported: bool,
    owner_program_id: &str,
    use_position: u32,
    state_bindings: &BTreeMap<SymbolId, NativeStateBinding>,
    derived_locals: &BTreeMap<SymbolId, NativeDerivedLocal>,
    active: &mut BTreeSet<SymbolId>,
    expanded_node_count: &mut usize,
) -> Option<ExpandedNativeExpression> {
    if !syntax_supported
        || expression_span.end < expression_span.start
        || (expression_span.end - expression_span.start) as usize
            > MAX_DERIVED_LOCAL_EXPANSION_BYTES
    {
        return None;
    }
    let mut expanded_source = String::with_capacity(
        ((expression_span.end - expression_span.start) as usize)
            .min(MAX_DERIVED_LOCAL_EXPANSION_BYTES),
    );
    let mut cursor = expression_span.start;
    let mut state_refs = BTreeSet::new();
    let mut references = Vec::new();
    let mut expanded_derived_refs = BTreeSet::new();
    let mut ordered_references = expression_references.to_vec();
    ordered_references.sort_by_key(|reference| reference.0);
    for (start, end, symbol) in ordered_references {
        if start < cursor || end > expression_span.end {
            return None;
        }
        expanded_source.push_str(source_range(source, cursor, start)?);
        if expanded_source.len() > MAX_DERIVED_LOCAL_EXPANSION_BYTES {
            return None;
        }
        let symbol = symbol?;
        if let Some(binding) = state_bindings.get(&symbol) {
            let output_start = u32::try_from(expanded_source.len()).ok()?;
            expanded_source.push_str(source_range(source, start, end)?);
            references.push(StateReference {
                start: output_start,
                end: u32::try_from(expanded_source.len()).ok()?,
                site_id: binding.site_id.clone(),
            });
            state_refs.insert(symbol);
        } else {
            let local = derived_locals.get(&symbol)?;
            if local.reserved_identifier
                || local.owner_program_id != owner_program_id
                || local.declaration_start >= use_position
                || active.len() >= MAX_DERIVED_LOCAL_EXPANSION_DEPTH
                || !active.insert(symbol)
            {
                return None;
            }
            *expanded_node_count = expanded_node_count.checked_add(local.initializer_node_count)?;
            if *expanded_node_count > MAX_DERIVED_LOCAL_EXPANSION_NODES {
                active.remove(&symbol);
                return None;
            }
            let nested = expand_native_expression(
                source,
                &local.initializer_span,
                &local.initializer_references,
                local.initializer_syntax_supported,
                owner_program_id,
                local.declaration_start,
                state_bindings,
                derived_locals,
                active,
                expanded_node_count,
            );
            active.remove(&symbol);
            let nested = nested?;
            let base = u32::try_from(expanded_source.len()).ok()?;
            expanded_source.push('(');
            expanded_source.push_str(&nested.source);
            expanded_source.push(')');
            for reference in nested.references {
                references.push(StateReference {
                    start: base.checked_add(1)?.checked_add(reference.start)?,
                    end: base.checked_add(1)?.checked_add(reference.end)?,
                    site_id: reference.site_id,
                });
            }
            state_refs.extend(nested.state_refs);
            expanded_derived_refs.insert(symbol);
            expanded_derived_refs.extend(nested.derived_refs);
        }
        if expanded_source.len() > MAX_DERIVED_LOCAL_EXPANSION_BYTES {
            return None;
        }
        cursor = end;
    }
    expanded_source.push_str(source_range(source, cursor, expression_span.end)?);
    if expanded_source.len() > MAX_DERIVED_LOCAL_EXPANSION_BYTES {
        return None;
    }
    Some(ExpandedNativeExpression {
        source: expanded_source,
        state_refs,
        references,
        derived_refs: expanded_derived_refs,
        expanded_node_count: *expanded_node_count,
    })
}

fn source_range(source: &str, start: u32, end: u32) -> Option<&str> {
    let start = usize::try_from(start).ok()?;
    let end = usize::try_from(end).ok()?;
    source.get(start..end)
}

fn derived_dependency_closure(
    roots: &BTreeSet<SymbolId>,
    local_reads: &[(SymbolId, SymbolId)],
    state_reads: &[(SymbolId, SymbolId, String)],
) -> (BTreeSet<SymbolId>, BTreeMap<SymbolId, String>) {
    let mut locals = BTreeSet::new();
    let mut states = BTreeMap::new();
    let mut pending: Vec<_> = roots.iter().copied().collect();
    while let Some(local) = pending.pop() {
        if !locals.insert(local) {
            continue;
        }
        for (owner, dependency) in local_reads {
            if *owner == local {
                pending.push(*dependency);
            }
        }
        for (owner, state, site) in state_reads {
            if *owner == local {
                states.insert(*state, site.clone());
            }
        }
    }
    (locals, states)
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
    matches!(module, "@compiled-ui/runtime" | "@compiled-ui/runtime/core" | "@r3act/core")
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
        let previous_single = self.current_declaration_is_single;
        self.current_declaration_is_const =
            node.kind == oxc_ast::ast::VariableDeclarationKind::Const;
        self.current_declaration_is_single = node.declarations.len() == 1;
        walk::walk_variable_declaration(self, node);
        self.current_declaration_is_const = previous;
        self.current_declaration_is_single = previous_single;
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
        if let JSXElementName::IdentifierReference(identifier) = &node.name
            && let Some(symbol) = identifier.reference_id.get()
                .and_then(|reference| self.semantic.scoping().get_reference(reference).symbol_id())
        {
            self.jsx_component_references.insert(symbol);
        }
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
                    arrow_initializer: None,
                    arrow_body_start: None,
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
                let arrow_parameter_hook = self.component_stack.last()
                    .and_then(|name| self.components.get(name))
                    .and_then(|component| component.arrow_body_start)
                    .is_some_and(|body_start| node.span.start < body_start);
                if self.function_depth != 1 || self.loop_depth != 0 || arrow_parameter_hook {
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
                    if let Some((component_span, kind)) = self.arrow_component_stack.last() {
                        self.unsupported_component_forms
                            .push((component_span.clone(), kind));
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
        let arrow = match node.init.as_ref() {
            Some(Expression::ArrowFunctionExpression(arrow)) if component_name.is_some() => Some(arrow),
            _ => None,
        };
        let arrow_supported = arrow.is_some_and(|arrow| {
            self.current_declaration_is_const && self.current_declaration_is_single
                && self.function_depth == 0 && !arrow.r#async
                && matches!(&node.id, BindingPattern::BindingIdentifier(identifier)
                    if identifier.symbol_id.get().is_some_and(|symbol| {
                        self.semantic.scoping().symbol_scope_id(symbol)
                            == self.semantic.scoping().root_scope_id()
                    }))
        });
        if let (Some(name), Some(arrow)) = (component_name, arrow) {
            if arrow_supported {
                for symbol in parameter_keyed_collection_symbol(
                    &arrow.params, self.semantic, &self.keyed_collection_type_symbols,
                ) {
                    self.keyed_collection_symbols.insert(symbol);
                    self.typed_keyed_collection_symbols.insert(symbol);
                }
                self.components.entry(name.to_owned()).or_insert_with(|| ComponentStateSiteIr {
                    name: name.to_owned(),
                    component_site_id: format!("{}#component:{}", self.source_file, name),
                    declaration: span(arrow.span.start, arrow.span.end),
                    arrow_initializer: Some(span(arrow.span.start, arrow.span.end)),
                    arrow_body_start: Some(arrow.body.span().start),
                    host_leaf_output: false,
                    state_sites: Vec::new(),
                    effect_sites: Vec::new(),
                    store_sites: Vec::new(),
                    collection_sites: Vec::new(),
                });
                self.component_stack.push(name.to_owned());
            } else {
                let kind = if arrow.r#async {
                    "async arrow"
                } else if !self.current_declaration_is_const {
                    "mutable arrow"
                } else if !self.current_declaration_is_single {
                    "multi-declarator arrow"
                } else {
                    "nested arrow"
                };
                if let BindingPattern::BindingIdentifier(identifier) = &node.id
                    && let Some(symbol) = identifier.symbol_id.get()
                {
                    self.unsupported_arrow_components.insert(symbol,
                        (span(node.span.start, node.span.end), kind, name.to_owned()));
                }
                self.arrow_component_stack.push((span(node.span.start, node.span.end), kind));
            }
        }
        walk::walk_variable_declarator(self, node);
        if arrow_supported {
            self.component_stack.pop();
        } else if arrow.is_some() {
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
            module_revision: String::new(),
            semantic_plan: SemanticPlan::empty(),
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
    let revision = module_revision(
        &request.path,
        &format!("{}\0{}", request.source, request.component_module.as_deref().unwrap_or(&request.source)),
    );
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
            match compile_native_component_module(&request.path, &component_source, &revision) {
                Ok((transformed, components, component_edits)) => {
                    plan.schema_version = 2;
                    plan.component_module = Some(transformed);
                    plan.components = Some(components);
                    plan.module_revision = revision.clone();
                    plan.semantic_plan = build_semantic_plan(
                        &request.path, &revision, plan.components.as_deref(), &plan.tasks, &plan.task_order,
                    );
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
        plan.module_revision = revision.clone();
        plan.semantic_plan = build_semantic_plan(&request.path, &revision, None, &plan.tasks, &plan.task_order);
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
        module_revision: String::new(),
        semantic_plan: SemanticPlan::empty(),
        source_file: request.path.clone(),
        helper_module: String::new(),
        tasks: Vec::new(),
        task_order: Vec::new(),
        component_module: None,
        components: None,
    };
    let component_source = request.component_module.unwrap_or(request.source);
    match compile_native_component_module(&request.path, &component_source, &revision) {
        Ok((transformed, components, component_edits)) => {
            plan.component_module = Some(transformed);
            plan.components = Some(components);
            plan.module_revision = revision.clone();
            plan.semantic_plan = build_semantic_plan(
                &request.path, &revision, plan.components.as_deref(), &plan.tasks, &plan.task_order,
            );
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
    revision: &str,
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
        current_declaration_is_single: false,
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
        unsupported_arrow_components: BTreeMap::new(),
        jsx_component_references: BTreeSet::new(),
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
    let collection_components: Vec<_> = collector.components.values().collect();
    let mut collection_tags = ClosedCollectionTagCollector {
        components: &collection_components,
        semantic: &semantic,
        symbols: BTreeSet::new(),
        direct_eval: false,
    };
    collection_tags.visit_program(&parsed.program);
    let stable_collection_tags = if collection_tags.direct_eval { BTreeSet::new() }
        else { collection_tags.symbols.into_iter().filter(|symbol|
            semantic.scoping().symbol_declarations(*symbol).filter(|node|
                !matches!(semantic.nodes().kind(*node),
                    AstKind::TSTypeAliasDeclaration(_) | AstKind::TSInterfaceDeclaration(_))
            ).count() == 1 &&
            semantic.scoping().get_resolved_references(*symbol).all(|reference| !reference.is_write())
        ).collect() };
    let mut collection_proofs = ClosedCollectionOwnerCollector {
        components: &collection_components,
        semantic: &semantic,
        stable_tags: &stable_collection_tags,
        symbols: collector.keyed_collection_symbols.union(&collector.keyed_collection_alias_symbols)
            .copied().collect(),
        eligible: BTreeSet::new(),
    };
    collection_proofs.visit_program(&parsed.program);
    let eligible_collection_owners = collection_proofs.eligible;
    for component in collector.components.values_mut() {
        for site in &mut component.collection_sites {
            site.requires_owner_render = outside_collection_reads.contains(&site.collection_symbol)
                || !eligible_collection_owners.contains(&component.component_site_id);
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
                "native hooks in {kind} components are unsupported; use a module-level synchronous const arrow or named function declaration"
            ),
        ));
    }
    if let Some((_, (at, kind, name))) = collector.unsupported_arrow_components.iter()
        .find(|(symbol, _)| collector.jsx_component_references.contains(*symbol))
    {
        return Err(format_source_error(path, source, at.start,
            &format!("native JSX component `{name}` uses an unsupported {kind} declaration")));
    }
    if let Some(at) = collector.unscoped_hook_calls.first() {
        return Err(format_source_error(
            path,
            source,
            at.start,
            "native hooks must be called directly inside a module-level capitalized native component",
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
    let mut closed_resource_collector = ClosedResourceHostCollector {
        components: &state_plan.components,
        semantic: &semantic,
        source,
        revision,
        programs: BTreeMap::new(),
    };
    closed_resource_collector.visit_program(&parsed.program);
    let closed_resource_programs = closed_resource_collector.programs;
    let mut closed_store_collector = ClosedStoreHostCollector {
        components: &state_plan.components,
        semantic: &semantic,
        source,
        revision,
        programs: BTreeMap::new(),
        tuple_spans: BTreeMap::new(),
    };
    closed_store_collector.visit_program(&parsed.program);
    let closed_store_programs = closed_store_collector.programs;
    let closed_store_tuple_spans = closed_store_collector.tuple_spans;
    let closed_forward_programs = closed_component_forward_programs(
        &parsed.program, &state_plan.components, &semantic, source, revision,
        &closed_resource_programs, &closed_store_programs);
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
            "{path}:1:1: no capitalized synchronous native components found"
        ));
    }
    for component in &state_plan.components {
        if component.arrow_initializer.is_some() {
            continue;
        }
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
    let mut derived_collector = NativeDerivedLocalCollector {
        components: &state_plan.components,
        semantic: &semantic,
        locals: BTreeMap::new(),
    };
    derived_collector.visit_program(&parsed.program);
    let derived_locals = derived_collector.locals;
    let mut usage = NativeStateUsageCollector {
        semantic: &semantic,
        call_sites,
        bindings: BTreeMap::new(),
        derived_locals,
        setter_symbols: BTreeSet::new(),
        current_declaration_is_const: false,
        candidates: Vec::new(),
        components: &state_plan.components,
        source,
        intrinsic_opening: Vec::new(),
        outside_state_reads: BTreeSet::new(),
        derived_initializer_state_reads: Vec::new(),
        derived_initializer_reads: Vec::new(),
        outside_derived_reads: BTreeSet::new(),
        derived_expansion_totals: BTreeMap::new(),
        over_budget_owners: BTreeSet::new(),
        numeric_sites: BTreeSet::new(),
    };
    usage.visit_program(&parsed.program);
    let mut prop_edits = Vec::<(
        SourceSpan,
        String,
        String,
        bool,
        Option<usize>,
        Option<String>,
    )>::new();
    let mut numeric_programs = Vec::<Sink>::new();
    let mut opaque_sinks = Vec::<(String, String)>::new();
    let mut prop_sites = BTreeSet::new();
    let mut fallback_sites = BTreeSet::new();
    let mut layout_eligible_sites = BTreeSet::new();
    struct CandidateClassification<'a> {
        owner_program_id: Option<String>,
        bindings: Vec<&'a NativeStateBinding>,
        site_ids: BTreeSet<String>,
        certified: bool,
    }
    let mut expanded_candidates = Vec::with_capacity(usage.candidates.len());
    let mut effective_state_refs = Vec::with_capacity(usage.candidates.len());
    let mut used_derived_locals = BTreeSet::new();
    let over_budget_owners = usage.over_budget_owners.clone();
    for candidate in &usage.candidates {
        let roots: BTreeSet<_> = candidate
            .derived_reference_sites
            .values()
            .copied()
            .collect();
        let owner = state_plan.components.iter().find(|component| {
            component.declaration.start <= candidate.span.start
                && candidate.span.end <= component.declaration.end
        });
        let expanded =
            if owner.is_some_and(|owner| over_budget_owners.contains(&owner.component_site_id)) {
                None
            } else {
                candidate.expanded.clone()
            };
        let (_, derived_state_refs) = derived_dependency_closure(
            &roots,
            &usage.derived_initializer_reads,
            &usage.derived_initializer_state_reads,
        );
        let mut refs = candidate.state_refs.clone();
        refs.extend(derived_state_refs.keys().copied());
        if let Some(expanded) = &expanded {
            used_derived_locals.extend(expanded.derived_refs.iter().copied());
            refs.extend(expanded.state_refs.iter().copied());
        }
        expanded_candidates.push(expanded);
        effective_state_refs.push(refs);
    }
    for (derived, _, site) in &usage.derived_initializer_state_reads {
        if !used_derived_locals.contains(derived) {
            usage.outside_state_reads.insert(site.clone());
        }
    }
    if !usage.outside_derived_reads.is_empty() {
        let (_, outside_states) = derived_dependency_closure(
            &usage.outside_derived_reads,
            &usage.derived_initializer_reads,
            &usage.derived_initializer_state_reads,
        );
        usage
            .outside_state_reads
            .extend(outside_states.into_values());
    }
    struct StableModuleRefs<'s, 'a> {
        semantic: &'s Semantic<'a>,
        symbols: BTreeSet<SymbolId>,
        direct_eval: bool,
    }
    impl<'a> Visit<'a> for StableModuleRefs<'_, 'a> {
        fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
            if let Some(symbol) = node.id.as_ref().and_then(|id| id.symbol_id.get())
                && self.semantic.scoping().symbol_scope_id(symbol) == self.semantic.scoping().root_scope_id()
            {
                self.symbols.insert(symbol);
            }
            walk::walk_function(self, node, flags);
        }

        fn visit_variable_declaration(&mut self, node: &VariableDeclaration<'a>) {
            if node.kind == oxc_ast::ast::VariableDeclarationKind::Const {
                for declarator in &node.declarations {
                    if let BindingPattern::BindingIdentifier(binding) = &declarator.id
                        && let Some(symbol) = binding.symbol_id.get()
                        && self.semantic.scoping().symbol_scope_id(symbol) == self.semantic.scoping().root_scope_id()
                        && matches!(declarator.init.as_ref(),
                            Some(Expression::FunctionExpression(_) | Expression::ArrowFunctionExpression(_)))
                    {
                        self.symbols.insert(symbol);
                    }
                }
            }
            walk::walk_variable_declaration(self, node);
        }

        fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
            let mut callee = &node.callee;
            while let Expression::ParenthesizedExpression(parenthesized) = callee {
                callee = &parenthesized.expression;
            }
            if matches!(callee, Expression::Identifier(identifier) if identifier.name == "eval") {
                self.direct_eval = true;
            }
            walk::walk_call_expression(self, node);
        }
    }
    let mut refs = StableModuleRefs {
        semantic: &semantic, symbols: BTreeSet::new(), direct_eval: false,
    };
    refs.visit_program(&parsed.program);
    let stable_refs = if refs.direct_eval { BTreeSet::new() } else {
        refs.symbols.into_iter().filter(|symbol|
            semantic.scoping().symbol_declarations(*symbol).count() == 1 &&
            semantic.scoping().get_resolved_references(*symbol).all(|reference|
                !reference.is_write())
        ).collect::<BTreeSet<_>>()
    };
    struct ClosedNumericOwnerCollector<'s, 'a> {
        components: &'s [ComponentStateSiteIr],
        semantic: &'s Semantic<'a>,
        stable_refs: &'s BTreeSet<SymbolId>,
        certified_spans: &'s BTreeSet<(u32, u32)>,
        eligible: BTreeMap<String, BTreeSet<String>>,
    }
    impl<'a> Visit<'a> for ClosedNumericOwnerCollector<'_, 'a> {
        fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
            if let Some(component) = self.components.iter().find(|component|
                component.arrow_initializer.is_none() &&
                component.declaration.start == node.span.start &&
                component.declaration.end == node.span.end)
                && let Some(callable) = ClosedCallable::function(node)
            {
                let mut required_props = BTreeSet::new();
                if closed_numeric_owner_body(&callable, component, self.semantic,
                    self.stable_refs, self.certified_spans, &mut required_props) {
                    self.eligible.insert(component.component_site_id.clone(), required_props);
                }
            }
            walk::walk_function(self, node, flags);
        }

        fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
            if let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
                && let Some(component) = self.components.iter().find(|component|
                    component.arrow_initializer.as_ref().is_some_and(|at|
                        at.start == arrow.span.start && at.end == arrow.span.end))
                && let Some(symbol) = node.id.get_binding_identifier().and_then(|id| id.symbol_id.get())
                && let Some(callable) = ClosedCallable::arrow(arrow, symbol)
            {
                let mut required_props = BTreeSet::new();
                if closed_numeric_owner_body(&callable, component, self.semantic,
                    self.stable_refs, self.certified_spans, &mut required_props) {
                    self.eligible.insert(component.component_site_id.clone(), required_props);
                }
            }
            walk::walk_variable_declarator(self, node);
        }
    }
    let mut classifications = Vec::with_capacity(usage.candidates.len());
    for (candidate_index, candidate) in usage.candidates.iter().enumerate() {
        let owner_component = state_plan.components.iter().find(|component| {
            component.declaration.start <= candidate.span.start
                && candidate.span.end <= component.declaration.end
        });
        let symbols = &effective_state_refs[candidate_index];
        if symbols.is_empty() {
            classifications.push(CandidateClassification {
                owner_program_id: None,
                bindings: Vec::new(),
                site_ids: BTreeSet::new(),
                certified: false,
            });
            continue;
        }
        let expression = expanded_candidates[candidate_index]
            .as_ref()
            .map(|expanded| expanded.source.clone())
            .unwrap_or_else(|| slice(source, candidate.span.clone()));
        let mut bindings: Vec<_> = candidate
            .state_refs
            .union(symbols)
            .filter_map(|symbol| usage.bindings.get(symbol))
            .collect();
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
        let derived_is_closed = candidate.derived_reference_sites.is_empty()
            || expanded_candidates[candidate_index].is_some();
        let certified = !candidate.other_refs
            && derived_is_closed
            && owner_local
            && !state_plan
                .components
                .iter()
                .flat_map(|component| &component.store_sites)
                .any(|store| {
                    candidate.span.start <= store.call.start && candidate.span.end >= store.call.end
                })
            && bindings.len() == symbols.len()
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
    let certified_spans = usage.candidates.iter().zip(&classifications)
        .filter(|(_, classification)| classification.certified &&
            classification.site_ids.iter().all(|site| !ineligible_numeric_sites.contains(site)))
        .map(|(candidate, _)| (candidate.span.start, candidate.span.end))
        .collect::<BTreeSet<_>>();
    let mut numeric_owners = ClosedNumericOwnerCollector {
        components: &state_plan.components, semantic: &semantic,
        stable_refs: &stable_refs, certified_spans: &certified_spans,
        eligible: BTreeMap::new(),
    };
    numeric_owners.visit_program(&parsed.program);
    for (candidate_index, (candidate, classification)) in
        usage.candidates.iter().zip(&classifications).enumerate()
    {
        if classification.site_ids.is_empty() {
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
            let expanded = expanded_candidates[candidate_index].as_ref();
            let expression = expanded
                .map(|expression| expression.source.clone())
                .unwrap_or_else(|| slice(source, candidate.span.clone()));
            let references = expanded.map_or_else(
                || {
                    candidate
                        .state_reference_sites
                        .iter()
                        .map(|(&(start, end), site_id)| StateReference {
                            start: start - candidate.span.start,
                            end: end - candidate.span.start,
                            site_id: site_id.clone(),
                        })
                        .collect()
                },
                |expanded| expanded.references.clone(),
            );
            numeric_programs.push(Sink {
                owner_program_id,
                sink_id,
                source_sites,
                expression: expression.clone(),
                references,
            });
            prop_edits.push((
                candidate.span.clone(),
                prefix,
                "))".to_owned(),
                singular,
                Some(descriptor_index),
                if candidate.derived_reference_sites.is_empty() {
                    None
                } else {
                    Some(expression)
                },
            ));
            prop_sites.extend(ordered.iter().map(|binding| binding.site_id.clone()));
            layout_eligible_sites.extend(site_ids.iter().cloned());
        } else {
            fallback_sites.extend(bindings.iter().map(|binding| binding.site_id.clone()));
            if let Some(owner) = &classification.owner_program_id {
                opaque_sinks.push((owner.clone(), format!("{path}#opaque-sink:{}", candidate.span.start)));
            }
        }
    }
    usage.outside_state_reads.extend(fallback_sites);
    let component_prop_sites: BTreeMap<_, _> = state_plan
        .components
        .iter()
        .map(|component| {
            let owner_closed = numeric_owners.eligible.contains_key(&component.component_site_id);
            let sites = component
                .state_sites
                .iter()
                .filter(|state| {
                    owner_closed && prop_sites.contains(&state.site_id)
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
    let numeric_primitive_props: BTreeMap<_, _> = numeric_owners.eligible.into_iter()
        .filter(|(owner, _)| component_prop_sites.get(owner).is_some_and(|sites| !sites.is_empty()))
        .collect();
    let (transformed, edits) = transform_native_component_source(
        path,
        source,
        revision,
        &state_plan,
        &prop_edits,
        &numeric_programs,
        &component_prop_sites,
        &numeric_primitive_props,
        &component_state_layouts,
        &closed_resource_programs,
        &closed_store_programs,
        &closed_forward_programs,
        &closed_store_tuple_spans,
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
            numeric_primitive_props: numeric_primitive_props
                .get(&component.component_site_id).into_iter().flatten().cloned().collect(),
            state_layout: component_state_layouts
                .get(&component.component_site_id)
                .filter(|slots| !slots.is_empty())
                .cloned()
            .map(|slots| NativeStateLayoutMetadata {
                    schema_version: 1,
                    program_id: Some(component.component_site_id.clone()),
                    module_revision: revision.to_owned(),
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
            closed_resource_host_program: closed_resource_programs
                .get(&component.component_site_id)
                .cloned(),
            closed_store_host_program: closed_store_programs
                .get(&component.component_site_id)
                .cloned(),
            closed_component_forward_program: closed_forward_programs
                .get(&component.component_site_id)
                .map(|edge| edge.program.clone()),
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
            closed_collection_sites: component.collection_sites.iter()
                .filter(|site| !site.requires_owner_render)
                .map(|site| site.site_id.clone()).collect(),
            numeric_sinks: numeric_programs.iter()
                .filter(|sink| sink.owner_program_id == component.component_site_id)
                .map(|sink| NativeNumericSinkMetadata {
                    sink_id: sink.sink_id.clone(),
                    source_sites: sink.source_sites.clone(),
                    primitive_value: primitive_output_expression(&sink.expression),
                })
                .collect(),
            opaque_sinks: opaque_sinks.iter()
                .filter(|(owner, _)| owner == &component.component_site_id)
                .map(|(_, sink)| sink.clone())
                .collect(),
        })
        .collect();
    Ok((transformed, components, edits))
}

fn numeric_expression_is_pure(source: &str, state_names: &BTreeSet<String>) -> bool {
    let allocator = Allocator::default();
    let Ok(expression) = Parser::new(&allocator, source, SourceType::tsx()).parse_expression()
    else {
        return false;
    };
    owner_update_program::visit_closed_primitive_expression(
        &expression,
        owner_update_program::ClosedExpressionPolicy::PrimitiveOrArray,
        &mut |identifier| state_names.contains(identifier.name.as_str()),
    )
}

fn emit_primitive_owner_cut_kernels(
    numeric_programs: &[Sink],
    state_layouts: &BTreeMap<String, Vec<NativeStateLayoutSlotMetadata>>,
    kernel_alias: &str,
    helper_module: &str,
) -> (String, BTreeMap<String, usize>) {
    let mut owners = BTreeSet::new();
    for program in numeric_programs {
        owners.insert(program.owner_program_id.clone());
    }
    let mut kernels = Vec::new();
    let mut indices = BTreeMap::new();
    for owner in owners {
        let Some(layout) = state_layouts.get(&owner) else {
            continue;
        };
        let sinks: Vec<_> = numeric_programs
            .iter()
            .filter(|program| program.owner_program_id == owner)
            .collect();
        let ordered_layout_site_ids: Vec<_> =
            layout.iter().map(|entry| entry.site_id.as_str()).collect();
        let Some(code) = emit_owner_update_program(&owner, &ordered_layout_site_ids, &sinks) else {
            continue;
        };
        indices.insert(owner, kernels.len());
        kernels.push(code);
    }
    if kernels.is_empty() {
        return (String::new(), indices);
    }
    (
        format!(
            "\nconst {kernel_alias}: readonly import({helper_module}).CompiledOwnerUpdateProgram[] = [{}];",
            kernels.join(", ")
        ),
        indices,
    )
}

fn closed_resource_literal(expression: &Expression<'_>) -> Option<serde_json::Value> {
    match expression {
        Expression::StringLiteral(value) => Some(serde_json::json!(value.value.as_str())),
        Expression::NumericLiteral(value) if value.value.is_finite() => Some(serde_json::json!(value.value)),
        Expression::BooleanLiteral(value) => Some(serde_json::json!(value.value)),
        Expression::NullLiteral(_) => Some(serde_json::Value::Null),
        _ => None,
    }
}

fn closed_numeric_value(
    expression: &Expression<'_>, values: &BTreeSet<SymbolId>, semantic: &Semantic<'_>,
) -> bool {
    owner_update_program::visit_closed_primitive_expression(
        expression, owner_update_program::ClosedExpressionPolicy::Primitive,
        &mut |identifier| reference_symbol(identifier, semantic)
            .is_some_and(|symbol| values.contains(&symbol)),
    )
}

fn closed_numeric_owner_value(
    expression: &Expression<'_>, values: &BTreeSet<SymbolId>,
    props_symbol: Option<SymbolId>, prop_bindings: &BTreeMap<SymbolId, String>,
    required_props: &mut BTreeSet<String>, semantic: &Semantic<'_>,
) -> bool {
    if let Expression::StaticMemberExpression(member) = expression
        && let Expression::Identifier(object) = &member.object
        && props_symbol.is_some_and(|symbol| reference_symbol(object, semantic) == Some(symbol))
    {
        let name = member.property.name.as_str();
        if matches!(name, "key" | "ref") { return false; }
        required_props.insert(name.to_string());
        return true;
    }
    owner_update_program::visit_closed_primitive_expression(
        expression, owner_update_program::ClosedExpressionPolicy::Primitive,
        &mut |identifier| {
            let Some(symbol) = reference_symbol(identifier, semantic) else { return false; };
            if let Some(name) = prop_bindings.get(&symbol) {
                if matches!(name.as_str(), "key" | "ref") { return false; }
                required_props.insert(name.clone());
                true
            } else { values.contains(&symbol) }
        },
    )
}

fn closed_numeric_array_value(
    expression: &Expression<'_>, values: &BTreeSet<SymbolId>,
    props_symbol: Option<SymbolId>, prop_bindings: &BTreeMap<SymbolId, String>,
    required_props: &mut BTreeSet<String>, semantic: &Semantic<'_>,
) -> bool {
    let Expression::ArrayExpression(array) = expression else { return false; };
    !array.elements.is_empty() && array.elements.len() <= 4 &&
        array.elements.iter().all(|item| item.as_expression().is_some_and(|value|
            closed_numeric_owner_value(value, values, props_symbol,
                prop_bindings, required_props, semantic)))
}

fn closed_numeric_setter_event(
    expression: &Expression<'_>, setters: &BTreeSet<SymbolId>, semantic: &Semantic<'_>,
) -> bool {
    let Expression::ArrowFunctionExpression(handler) = expression else { return false; };
    if handler.r#async || handler.params.rest.is_some() || !handler.params.items.is_empty() {
        return false;
    }
    let Some(Expression::CallExpression(call)) = handler.body.as_expression() else { return false; };
    let Expression::Identifier(callee) = &call.callee else { return false; };
    if !reference_symbol(callee, semantic).is_some_and(|symbol| setters.contains(&symbol)) ||
        call.optional || call.arguments.len() != 1 { return false; }
    let Some(value) = call.arguments.first().and_then(Argument::as_expression) else { return false; };
    if closed_numeric_value(value, &BTreeSet::new(), semantic) { return true; }
    let Expression::ArrowFunctionExpression(updater) = value else { return false; };
    if updater.r#async || updater.params.rest.is_some() || updater.params.items.len() != 1 {
        return false;
    }
    let parameter = &updater.params.items[0];
    let BindingPattern::BindingIdentifier(identifier) = &parameter.pattern else { return false; };
    if parameter.optional || parameter.initializer.is_some() { return false; }
    let Some(symbol) = identifier.symbol_id.get() else { return false; };
    let Some(body) = updater.body.as_expression() else { return false; };
    closed_numeric_value(body, &BTreeSet::from([symbol]), semantic)
}

fn closed_numeric_jsx(
    element: &JSXElement<'_>, values: &BTreeSet<SymbolId>,
    setters: &BTreeSet<SymbolId>, props_symbol: Option<SymbolId>,
    prop_bindings: &BTreeMap<SymbolId, String>, required_props: &mut BTreeSet<String>,
    semantic: &Semantic<'_>, stable_refs: &BTreeSet<SymbolId>,
    certified_spans: &BTreeSet<(u32, u32)>, depth: usize,
) -> bool {
    let JSXElementName::Identifier(tag) = &element.opening_element.name else { return false; };
    if depth >= 8 || !tag.name.as_str().bytes().next().is_some_and(|byte| byte.is_ascii_lowercase()) ||
        element.opening_element.attributes.len() > 256 || element.children.len() > 64 { return false; }
    for item in &element.opening_element.attributes {
        let JSXAttributeItem::Attribute(attribute) = item else { return false; };
        let JSXAttributeName::Identifier(name) = &attribute.name else { return false; };
        let name = name.name.as_str();
        if name == "key" {
            match attribute.value.as_ref() {
                Some(JSXAttributeValue::StringLiteral(_)) => {}
                Some(JSXAttributeValue::ExpressionContainer(container)) => {
                    let Some(expression) = container.expression.as_expression() else { return false; };
                    if !closed_numeric_owner_value(expression, &BTreeSet::new(), props_symbol,
                        prop_bindings, required_props, semantic) { return false; }
                }
                _ => return false,
            }
            continue;
        }
        if name == "ref" {
            let Some(JSXAttributeValue::ExpressionContainer(container)) = attribute.value.as_ref()
                else { return false; };
            let Some(Expression::Identifier(identifier)) = container.expression.as_expression()
                else { return false; };
            if !reference_symbol(identifier, semantic).is_some_and(|symbol| stable_refs.contains(&symbol)) {
                return false;
            }
            continue;
        }
        if name == "children" { return false; }
        let event = name.starts_with("on") &&
            name.as_bytes().get(2).is_some_and(|byte| byte.is_ascii_uppercase());
        if event {
            if !matches!(tag.name.as_str(), "button" | "div" | "span" | "output" | "input" | "a") {
                return false;
            }
            let Some(JSXAttributeValue::ExpressionContainer(container)) = attribute.value.as_ref()
                else { return false; };
            if !container.expression.as_expression().is_some_and(|expression|
                closed_numeric_setter_event(expression, setters, semantic)) { return false; }
            continue;
        }
        match attribute.value.as_ref() {
            Some(JSXAttributeValue::StringLiteral(_)) | None => {}
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                let Some(expression) = container.expression.as_expression() else { return false; };
                if name == "style" {
                    if !matches!(tag.name.as_str(), "div" | "span" | "output" | "button" | "input" | "a" | "i" | "li") {
                        return false;
                    }
                    let Expression::ObjectExpression(object) = expression else { return false; };
                    if object.properties.len() > 32 || !object.properties.iter().all(|item| {
                        let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) = item else { return false; };
                        !property.computed && !property.method && !property.shorthand &&
                            property.kind == oxc_ast::ast::PropertyKind::Init &&
                            matches!(&property.key, PropertyKey::StaticIdentifier(_) | PropertyKey::StringLiteral(_)) &&
                            closed_numeric_owner_value(&property.value, values, props_symbol,
                                prop_bindings, required_props, semantic)
                    }) { return false; }
                } else if !closed_numeric_owner_value(expression, values, props_symbol,
                    prop_bindings, required_props, semantic) {
                    let tuple = matches!(tag.name.as_str(), "mesh" | "group") &&
                        matches!(name, "position" | "rotation" | "scale");
                    let data = matches!(tag.name.as_str(), "div" | "span" | "output" | "button" | "input" | "a") &&
                        name.starts_with("data-");
                    let constructor_args = name == "args" && matches!(tag.name.as_str(),
                        "boxGeometry" | "sphereGeometry" | "planeGeometry" |
                        "cylinderGeometry" | "coneGeometry" | "torusGeometry");
                    let certified_position = matches!(expression, Expression::ArrayExpression(_)) &&
                        name == "position" &&
                        matches!(tag.name.as_str(), "i" | "li") &&
                        certified_spans.contains(&(expression.span().start, expression.span().end));
                    let empty_values = BTreeSet::new();
                    let empty_bindings = BTreeMap::new();
                    if !(tuple || data || constructor_args || certified_position) ||
                        !(certified_position || closed_numeric_array_value(expression,
                            if constructor_args { &empty_values } else { values },
                            if constructor_args { None } else { props_symbol },
                            if constructor_args { &empty_bindings } else { prop_bindings },
                            required_props, semantic)) { return false; }
                }
            }
            _ => return false,
        }
    }
    element.children.iter().all(|child| match child {
        JSXChild::Text(_) => true,
        JSXChild::Element(child) => closed_numeric_jsx(child, values, setters, props_symbol,
            prop_bindings, required_props, semantic, stable_refs, certified_spans, depth + 1),
        JSXChild::ExpressionContainer(container) =>
            matches!(&container.expression, JSXExpression::EmptyExpression(_)) ||
            container.expression.as_expression().is_some_and(|expression|
                closed_numeric_owner_value(expression, values, props_symbol,
                    prop_bindings, required_props, semantic)),
        _ => false,
    })
}

fn closed_numeric_owner_body(
    callable: &ClosedCallable<'_, '_>, component: &ComponentStateSiteIr,
    semantic: &Semantic<'_>, stable_refs: &BTreeSet<SymbolId>,
    certified_spans: &BTreeSet<(u32, u32)>,
    required_props: &mut BTreeSet<String>,
) -> bool {
    if component.state_sites.is_empty() || !component.store_sites.is_empty() ||
        !component.collection_sites.is_empty() || callable.params.rest.is_some() ||
        callable.params.items.len() > 1 ||
        callable.statements.len() > 65 { return false; }
    let mut props_symbol = None;
    let mut prop_bindings = BTreeMap::new();
    if let Some(parameter) = callable.params.items.first() {
        if parameter.optional || parameter.initializer.is_some() { return false; }
        match &parameter.pattern {
            BindingPattern::BindingIdentifier(identifier) => {
                props_symbol = identifier.symbol_id.get();
                if props_symbol.is_none() { return false; }
            }
            BindingPattern::ObjectPattern(pattern) if pattern.rest.is_none() &&
                pattern.properties.len() <= 32 => {
                for property in &pattern.properties {
                    let BindingPattern::BindingIdentifier(local) = &property.value else { return false; };
                    if property.computed { return false; }
                    let Some(name) = type_property_name(&property.key) else { return false; };
                    if matches!(name, "key" | "ref") { return false; }
                    let Some(symbol) = local.symbol_id.get() else { return false; };
                    prop_bindings.insert(symbol, name.to_owned());
                    required_props.insert(name.to_owned());
                }
            }
            _ => return false,
        }
    }
    let mut values = BTreeSet::new();
    let mut setters = BTreeSet::new();
    let mut state_calls = BTreeSet::new();
    let mut effect_calls = BTreeSet::new();
    let preceding = callable.statements.len().saturating_sub(1);
    for statement in callable.statements.iter().take(preceding) {
        if let Some(Declaration::VariableDeclaration(declaration)) = statement.as_declaration() {
            if declaration.kind != oxc_ast::ast::VariableDeclarationKind::Const ||
                declaration.declarations.len() != 1 { return false; }
            let declarator = &declaration.declarations[0];
            let Some(initializer) = declarator.init.as_ref() else { return false; };
            if let Expression::CallExpression(call) = initializer
                && let Some((index, _)) = component.state_sites.iter().enumerate().find(|(_, site)|
                    site.call.start == call.span.start && site.call.end == call.span.end)
            {
                let BindingPattern::ArrayPattern(pattern) = &declarator.id else { return false; };
                if !state_calls.insert(index) || call.optional || pattern.rest.is_some() ||
                    !(1..=2).contains(&pattern.elements.len()) || call.arguments.len() != 1 ||
                    !call.arguments.first().and_then(Argument::as_expression).is_some_and(|initial|
                        closed_numeric_owner_value(initial, &BTreeSet::new(), props_symbol,
                            &prop_bindings, required_props, semantic)) { return false; }
                let Some(Some(BindingPattern::BindingIdentifier(value))) = pattern.elements.first()
                    else { return false; };
                let Some(symbol) = value.symbol_id.get() else { return false; };
                values.insert(symbol);
                if let Some(second) = pattern.elements.get(1) {
                    let Some(BindingPattern::BindingIdentifier(setter)) = second else { return false; };
                    let Some(symbol) = setter.symbol_id.get() else { return false; };
                    setters.insert(symbol);
                }
                continue;
            }
            let BindingPattern::BindingIdentifier(local) = &declarator.id else { return false; };
            let Some(symbol) = local.symbol_id.get() else { return false; };
            if !closed_numeric_owner_value(initializer, &values, props_symbol,
                &prop_bindings, required_props, semantic) { return false; }
            values.insert(symbol);
        } else if let Statement::ExpressionStatement(statement) = statement {
            let Expression::CallExpression(call) = &statement.expression else { return false; };
            let Some((index, _)) = component.effect_sites.iter().enumerate().find(|(_, site)|
                site.call.start == call.span.start && site.call.end == call.span.end)
                else { return false; };
            if !effect_calls.insert(index) || call.optional || call.arguments.len() != 1 ||
                !call.arguments.first().and_then(Argument::as_expression).is_some_and(|setup|
                    matches!(setup, Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_))) {
                return false;
            }
        } else { return false; }
    }
    if state_calls.len() != component.state_sites.len() ||
        effect_calls.len() != component.effect_sites.len() { return false; }
    let Some(mut result) = callable.return_expression(preceding) else { return false; };
    while let Expression::ParenthesizedExpression(parenthesized) = result {
        result = &parenthesized.expression;
    }
    let Expression::JSXElement(element) = result else { return false; };
    closed_numeric_jsx(element, &values, &setters, props_symbol,
        &prop_bindings, required_props, semantic, stable_refs, certified_spans, 0)
}

fn closed_collection_row_jsx(
    element: &JSXElement<'_>, row: SymbolId, semantic: &Semantic<'_>,
    stable_tags: &BTreeSet<SymbolId>, depth: usize,
) -> bool {
    if depth >= 8 || element.opening_element.attributes.len() > 64 || element.children.len() > 64 ||
        !match &element.opening_element.name {
            JSXElementName::Identifier(tag) => tag.name.as_str().bytes().next()
                .is_some_and(|byte| byte.is_ascii_lowercase()),
            JSXElementName::IdentifierReference(tag) => reference_symbol(tag, semantic)
                .is_some_and(|symbol| stable_tags.contains(&symbol)),
            _ => false,
        } {
        return false;
    }
    for item in &element.opening_element.attributes {
        let JSXAttributeItem::Attribute(attribute) = item else { return false; };
        let JSXAttributeName::Identifier(name) = &attribute.name else { return false; };
        let name = name.name.as_str();
        if name == "ref" || name == "children" || name.starts_with("on") { return false; }
        match attribute.value.as_ref() {
            None | Some(JSXAttributeValue::StringLiteral(_)) => {}
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                let Some(expression) = container.expression.as_expression() else { return false; };
                if !closed_numeric_value(expression, &BTreeSet::new(), semantic) &&
                    !(name != "key" && matches!(expression, Expression::Identifier(identifier)
                        if reference_symbol(identifier, semantic) == Some(row))) {
                    return false;
                }
            }
            _ => return false,
        }
    }
    element.children.iter().all(|child| match child {
        JSXChild::Text(_) => true,
        JSXChild::Element(child) => closed_collection_row_jsx(child, row, semantic, stable_tags, depth + 1),
        JSXChild::ExpressionContainer(container) =>
            matches!(&container.expression, JSXExpression::EmptyExpression(_)) ||
            container.expression.as_expression().is_some_and(|expression|
                closed_numeric_value(expression, &BTreeSet::new(), semantic) ||
                matches!(expression, Expression::Identifier(identifier)
                    if reference_symbol(identifier, semantic) == Some(row))),
        _ => false,
    })
}

fn closed_collection_callback(call: &CallExpression<'_>, semantic: &Semantic<'_>,
    stable_tags: &BTreeSet<SymbolId>) -> bool {
    if call.optional || call.arguments.len() != 1 { return false; }
    let Some(Argument::ArrowFunctionExpression(callback)) = call.arguments.first() else { return false; };
    if callback.r#async || callback.params.rest.is_some() || callback.params.items.len() != 1 { return false; }
    let parameter = &callback.params.items[0];
    if parameter.optional || parameter.initializer.is_some() { return false; }
    let BindingPattern::BindingIdentifier(row) = &parameter.pattern else { return false; };
    let Some(row) = row.symbol_id.get() else { return false; };
    let Some(mut result) = callback.body.as_expression() else { return false; };
    while let Expression::ParenthesizedExpression(parenthesized) = result {
        result = &parenthesized.expression;
    }
    matches!(result, Expression::JSXElement(element)
        if closed_collection_row_jsx(element, row, semantic, stable_tags, 0))
}

fn closed_collection_owner_jsx(
    element: &JSXElement<'_>, sites: &[CollectionSiteIr],
    semantic: &Semantic<'_>, stable_tags: &BTreeSet<SymbolId>,
    seen: &mut BTreeSet<(u32, u32)>, depth: usize,
) -> bool {
    if depth >= 8 || element.opening_element.attributes.len() > 64 || element.children.len() > 64 ||
        !matches!(&element.opening_element.name, JSXElementName::Identifier(tag)
            if tag.name.as_str().bytes().next().is_some_and(|byte| byte.is_ascii_lowercase())) {
        return false;
    }
    for item in &element.opening_element.attributes {
        let JSXAttributeItem::Attribute(attribute) = item else { return false; };
        let JSXAttributeName::Identifier(name) = &attribute.name else { return false; };
        if name.name.as_str() == "ref" || name.name.as_str() == "children" || name.name.as_str().starts_with("on") {
            return false;
        }
        match attribute.value.as_ref() {
            None | Some(JSXAttributeValue::StringLiteral(_)) => {}
            Some(JSXAttributeValue::ExpressionContainer(container)) => {
                if !container.expression.as_expression().is_some_and(|expression|
                    closed_numeric_value(expression, &BTreeSet::new(), semantic)) { return false; }
            }
            _ => return false,
        }
    }
    element.children.iter().all(|child| match child {
        JSXChild::Text(_) => true,
        JSXChild::Element(child) => closed_collection_owner_jsx(child, sites, semantic, stable_tags, seen, depth + 1),
        JSXChild::ExpressionContainer(container) => {
            if matches!(&container.expression, JSXExpression::EmptyExpression(_)) { return true; }
            let Some(mut expression) = container.expression.as_expression() else { return false; };
            while let Expression::ParenthesizedExpression(parenthesized) = expression {
                expression = &parenthesized.expression;
            }
            if let Expression::CallExpression(call) = expression {
                if sites.iter().any(|site| site.call.start == call.span.start && site.call.end == call.span.end)
                    && closed_collection_callback(call, semantic, stable_tags) {
                    return seen.insert((call.span.start, call.span.end));
                }
            }
            closed_numeric_value(expression, &BTreeSet::new(), semantic)
        }
        _ => false,
    })
}

fn closed_collection_owner_body(
    callable: &ClosedCallable<'_, '_>, component: &ComponentStateSiteIr,
    semantic: &Semantic<'_>, collection_symbols: &BTreeSet<SymbolId>,
    stable_tags: &BTreeSet<SymbolId>,
) -> bool {
    if component.collection_sites.is_empty() || !component.store_sites.is_empty() ||
        !component.effect_sites.is_empty() ||
        callable.params.rest.is_some() || callable.params.items.len() > 1 ||
        callable.statements.len() > 65 { return false; }
    if callable.params.items.iter().any(|parameter| {
        if parameter.optional || parameter.initializer.is_some() { return true; }
        match &parameter.pattern {
            BindingPattern::BindingIdentifier(_) => false,
            BindingPattern::ObjectPattern(pattern) => pattern.rest.is_some() ||
                pattern.properties.len() > 32 || pattern.properties.iter().any(|property|
                    property.computed || type_property_name(&property.key).is_none() ||
                    !matches!(&property.value, BindingPattern::BindingIdentifier(_))),
            _ => true,
        }
    }) { return false; }
    let preceding = if callable.concise.is_some() { 0 } else { callable.statements.len().saturating_sub(1) };
    let mut state_calls = BTreeSet::new();
    for statement in callable.statements.iter().take(preceding) {
        if let Some(Declaration::VariableDeclaration(declaration)) = statement.as_declaration() {
            if declaration.kind != oxc_ast::ast::VariableDeclarationKind::Const ||
                declaration.declarations.len() != 1 { return false; }
            let declarator = &declaration.declarations[0];
            let Some(initializer) = declarator.init.as_ref() else { return false; };
            if let Expression::CallExpression(call) = initializer
                && let Some((index, _)) = component.state_sites.iter().enumerate().find(|(_, site)|
                    site.call.start == call.span.start && site.call.end == call.span.end) {
                let BindingPattern::ArrayPattern(pattern) = &declarator.id else { return false; };
                if !state_calls.insert(index) || pattern.rest.is_some() ||
                    !(1..=2).contains(&pattern.elements.len()) ||
                    pattern.elements.iter().any(|item| item.as_ref().is_some_and(|binding|
                        !matches!(binding, BindingPattern::BindingIdentifier(_)))) ||
                    call.optional || call.arguments.len() != 1 ||
                    !call.arguments.first().and_then(Argument::as_expression).is_some_and(|value|
                        closed_numeric_value(value, &BTreeSet::new(), semantic)) { return false; }
            } else {
                let BindingPattern::BindingIdentifier(_) = &declarator.id else { return false; };
                let Expression::Identifier(identifier) = initializer else { return false; };
                if !reference_symbol(identifier, semantic).is_some_and(|symbol|
                    collection_symbols.contains(&symbol)) {
                    return false;
                }
            }
        } else { return false; }
    }
    if state_calls.len() != component.state_sites.len() {
        return false;
    }
    let Some(mut result) = callable.return_expression(preceding) else { return false; };
    while let Expression::ParenthesizedExpression(parenthesized) = result {
        result = &parenthesized.expression;
    }
    let Expression::JSXElement(element) = result else { return false; };
    let mut seen = BTreeSet::new();
    closed_collection_owner_jsx(element, &component.collection_sites, semantic, stable_tags, &mut seen, 0) &&
        seen.len() == component.collection_sites.len()
}

struct ClosedCollectionTagCollector<'s, 'a> {
    components: &'s [&'s ComponentStateSiteIr],
    semantic: &'s Semantic<'a>,
    symbols: BTreeSet<SymbolId>,
    direct_eval: bool,
}

impl<'a> Visit<'a> for ClosedCollectionTagCollector<'_, 'a> {
    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        if self.components.iter().any(|component|
            component.arrow_initializer.is_none() && component.declaration.start == node.span.start &&
            component.declaration.end == node.span.end)
            && let Some(symbol) = node.id.as_ref().and_then(|id| id.symbol_id.get())
            && self.semantic.scoping().symbol_scope_id(symbol) == self.semantic.scoping().root_scope_id() {
            self.symbols.insert(symbol);
        }
        walk::walk_function(self, node, flags);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
            && self.components.iter().any(|component| component.arrow_initializer.as_ref()
                .is_some_and(|at| at.start == arrow.span.start && at.end == arrow.span.end))
            && let Some(symbol) = node.id.get_binding_identifier().and_then(|id| id.symbol_id.get())
            && self.semantic.scoping().symbol_scope_id(symbol) == self.semantic.scoping().root_scope_id() {
            self.symbols.insert(symbol);
        }
        walk::walk_variable_declarator(self, node);
    }

    fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
        if matches!(&node.callee, Expression::Identifier(identifier) if identifier.name == "eval") {
            self.direct_eval = true;
        }
        walk::walk_call_expression(self, node);
    }
}

struct ClosedCollectionOwnerCollector<'s, 'a> {
    components: &'s [&'s ComponentStateSiteIr],
    semantic: &'s Semantic<'a>,
    stable_tags: &'s BTreeSet<SymbolId>,
    symbols: BTreeSet<SymbolId>,
    eligible: BTreeSet<String>,
}

impl<'a> Visit<'a> for ClosedCollectionOwnerCollector<'_, 'a> {
    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        if let Some(component) = self.components.iter().find(|component|
            component.arrow_initializer.is_none() && component.declaration.start == node.span.start &&
            component.declaration.end == node.span.end)
            && let Some(callable) = ClosedCallable::function(node)
            && closed_collection_owner_body(&callable, component, self.semantic, &self.symbols, self.stable_tags) {
            self.eligible.insert(component.component_site_id.clone());
        }
        walk::walk_function(self, node, flags);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
            && let Some(component) = self.components.iter().find(|component|
                component.arrow_initializer.as_ref().is_some_and(|at|
                    at.start == arrow.span.start && at.end == arrow.span.end))
            && let Some(symbol) = node.id.get_binding_identifier().and_then(|id| id.symbol_id.get())
            && let Some(callable) = ClosedCallable::arrow(arrow, symbol)
            && closed_collection_owner_body(&callable, component, self.semantic, &self.symbols, self.stable_tags) {
            self.eligible.insert(component.component_site_id.clone());
        }
        walk::walk_variable_declarator(self, node);
    }
}

struct ClosedCallable<'a, 'b> {
    params: &'b FormalParameters<'a>,
    statements: &'b [Statement<'a>],
    concise: Option<&'b Expression<'a>>,
    own_symbol: Option<SymbolId>,
}

impl<'a, 'b> ClosedCallable<'a, 'b> {
    fn function(node: &'b Function<'a>) -> Option<Self> {
        if node.r#async || node.generator { return None; }
        let body = node.body.as_ref()?;
        if !body.directives.is_empty() { return None; }
        Some(Self { params: &node.params, statements: &body.statements, concise: None,
            own_symbol: node.id.as_ref().and_then(|id| id.symbol_id.get()) })
    }

    fn arrow(node: &'b ArrowFunctionExpression<'a>, own_symbol: SymbolId) -> Option<Self> {
        if node.r#async { return None; }
        let (statements, concise) = match &node.body {
            ArrowFunctionBody::FunctionBody(body) if body.directives.is_empty() =>
                (body.statements.as_slice(), None),
            ArrowFunctionBody::FunctionBody(_) => return None,
            body => (&[][..], Some(body.as_expression()?)),
        };
        Some(Self { params: &node.params, statements, concise,
            own_symbol: Some(own_symbol) })
    }

    fn return_expression(&self, preceding: usize) -> Option<&Expression<'a>> {
        if let Some(expression) = self.concise {
            return (preceding == 0).then_some(expression);
        }
        if self.statements.len() != preceding + 1 { return None; }
        let Statement::ReturnStatement(statement) = self.statements.get(preceding)? else {
            return None;
        };
        statement.argument.as_ref()
    }
}

fn closed_resource_host_program(
    callable: &ClosedCallable<'_, '_>,
    component: &ComponentStateSiteIr,
    semantic: &Semantic<'_>,
    revision: &str,
) -> Option<serde_json::Value> {
    if callable.params.items.len() != 1 || callable.params.rest.is_some()
        || component.state_sites.len() != 0 || component.effect_sites.len() != 0
        || component.collection_sites.len() != 0 || component.store_sites.len() != 1
        || component.store_sites[0].hook_name != "use"
    {
        return None;
    }
    let parameter = &callable.params.items[0];
    if parameter.optional || parameter.initializer.is_some() { return None; }
    let (props_symbol, destructured) = match &parameter.pattern {
        BindingPattern::BindingIdentifier(identifier) => (identifier.symbol_id.get(), None),
        BindingPattern::ObjectPattern(pattern) if pattern.rest.is_none() && pattern.properties.len() == 1 => {
            let property = &pattern.properties[0];
            let BindingPattern::BindingIdentifier(local) = &property.value else { return None; };
            if property.computed { return None; }
            (None, Some((type_property_name(&property.key)?.to_owned(), local.symbol_id.get()?)))
        }
        _ => return None,
    };
    if callable.statements.len() != 2 { return None; }
    let declaration = match callable.statements.first()?.as_declaration()? {
        Declaration::VariableDeclaration(declaration)
            if declaration.kind == oxc_ast::ast::VariableDeclarationKind::Const && declaration.declarations.len() == 1 => declaration,
        _ => return None,
    };
    let declarator = &declaration.declarations[0];
    let BindingPattern::BindingIdentifier(value_binding) = &declarator.id else { return None; };
    let value_symbol = value_binding.symbol_id.get()?;
    let Expression::CallExpression(call) = declarator.init.as_ref()? else { return None; };
    if call.arguments.len() != 1 || component.store_sites[0].call.start != call.span.start
        || component.store_sites[0].call.end != call.span.end { return None; }
    let resource_argument = call.arguments.first()?.as_expression()?;
    let resource_prop = if let Expression::StaticMemberExpression(member) = resource_argument {
        let Expression::Identifier(object) = &member.object else { return None; };
        if reference_symbol(object, semantic) != props_symbol || props_symbol.is_none() { return None; }
        member.property.name.to_string()
    } else if let Expression::Identifier(identifier) = resource_argument {
        let (name, symbol) = destructured.as_ref()?;
        if reference_symbol(identifier, semantic) != Some(*symbol) { return None; }
        name.clone()
    } else { return None; };
    if !resource_prop.bytes().next().is_some_and(|byte| byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$')
        || !resource_prop.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'$') { return None; }
    let mut return_expression = callable.return_expression(1)?;
    while let Expression::ParenthesizedExpression(parenthesized) = return_expression {
        return_expression = &parenthesized.expression;
    }
    let Expression::JSXElement(element) = return_expression else { return None; };
    let JSXElementName::Identifier(tag) = &element.opening_element.name else { return None; };
    if tag.name != "div" || element.opening_element.attributes.len() > 33 ||
        element.children.len() > 256 { return None; }
    let mut key = None;
    let mut props = Vec::<serde_json::Value>::new();
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
            if !name.starts_with("data-") || name.len() < 6 || !name.as_bytes()[5].is_ascii_lowercase() || !name[6..].bytes().all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-') || !seen.insert(name.to_owned()) { return None; }
            let literal = match attribute.value.as_ref()? {
                JSXAttributeValue::StringLiteral(value) if !value.value.chars().any(|ch| matches!(ch, '&' | '\n' | '\r' | '\t')) => serde_json::json!(value.value.as_str()),
                JSXAttributeValue::ExpressionContainer(container) => closed_resource_literal(container.expression.as_expression()?)?,
                _ => return None,
            };
            props.push(serde_json::json!([name, literal]));
        }
    }
    let key = key?;
    let mut child_count = 0;
    for child in &element.children {
        if closed_jsx_child_elided(child) { continue; }
        match child {
            JSXChild::ExpressionContainer(container) => {
                let Expression::Identifier(identifier) = container.expression.as_expression()? else { return None; };
                if reference_symbol(identifier, semantic) != Some(value_symbol) { return None; }
                child_count += 1;
            }
            _ => return None,
        }
    }
    if child_count != 1 { return None; }
    Some(serde_json::json!({
        "schemaVersion": 1,
        "componentProgramId": component.component_site_id,
        "moduleRevision": revision,
        "resourceUseSiteId": component.store_sites[0].site_id,
        "resourceProp": resource_prop,
        "host": { "tag": "div", "key": key, "props": props, "child": "resource-value" }
    }))
}

fn closed_resource_subtree_property_name(tag: &str, name: &str) -> bool {
    if name == "key" || name == "children" || name == "ref" || name == "style" ||
        name == "__proto__" || name == "prototype" || name == "constructor" ||
        name.starts_with("on") { return false; }
    match tag {
        "div" | "span" | "output" => name.starts_with("data-") && name.len() >= 6 &&
            name.as_bytes()[5].is_ascii_lowercase() && name[6..].bytes().all(|byte|
                byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-'),
        "group" | "mesh" => name == "name" || name == "visible" || matches!(name,
            "position-x" | "position-y" | "position-z" |
            "rotation-x" | "rotation-y" | "rotation-z" |
            "scale-x" | "scale-y" | "scale-z"),
        _ => false,
    }
}

fn closed_host_style_name(name: &str) -> bool {
    if matches!(name, "__proto__" | "prototype" | "constructor") { return false; }
    let body = name.strip_prefix("--").unwrap_or(name);
    !body.is_empty() && (body.as_bytes()[0].is_ascii_alphabetic() ||
        body.as_bytes()[0] == b'_') && body.bytes().all(|byte|
        byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
}

fn closed_jsx_child_elided(child: &JSXChild<'_>) -> bool {
    match child {
        JSXChild::ExpressionContainer(container) =>
            matches!(&container.expression, JSXExpression::EmptyExpression(_)),
        JSXChild::Text(text) => text.raw.as_ref().is_some_and(|raw| {
            let raw = raw.as_str();
            raw.bytes().any(|byte| matches!(byte, b'\r' | b'\n')) &&
                raw.bytes().all(|byte| matches!(byte, b' ' | b'\t' | b'\r' | b'\n')) &&
                text.value.as_str().bytes().all(|byte| matches!(byte, b' ' | b'\t' | b'\r' | b'\n'))
        }),
        _ => false,
    }
}

fn closed_jsx_children_empty(children: &[JSXChild<'_>]) -> bool {
    children.iter().all(closed_jsx_child_elided)
}

fn closed_host_aggregate_expression<'a>(
    expression: &Expression<'a>, tag: &str, name: &str,
    read: &mut dyn FnMut(&Expression<'a>) -> Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    let mut expression = expression;
    while let Expression::ParenthesizedExpression(parenthesized) = expression {
        expression = &parenthesized.expression;
    }
    if matches!(tag, "mesh" | "group") && matches!(name, "position" | "rotation" | "scale") {
        let Expression::ArrayExpression(array) = expression else { return None; };
        if array.elements.len() != 3 { return None; }
        let items = array.elements.iter().map(|item| read(item.as_expression()?))
            .collect::<Option<Vec<_>>>()?;
        return Some(serde_json::json!({"kind":"tuple","items":items}));
    }
    if matches!(tag, "div" | "span" | "output") && name == "style" {
        let Expression::ObjectExpression(object) = expression else { return None; };
        if object.properties.len() > 32 { return None; }
        let mut seen = BTreeSet::new();
        let mut entries = Vec::with_capacity(object.properties.len());
        for property in &object.properties {
            let oxc_ast::ast::ObjectPropertyKind::ObjectProperty(property) = property else { return None; };
            if property.computed || property.method || property.shorthand ||
                property.kind != oxc_ast::ast::PropertyKind::Init { return None; }
            let key = match &property.key {
                PropertyKey::StaticIdentifier(key) => key.name.as_str(),
                PropertyKey::StringLiteral(key) => key.value.as_str(),
                _ => return None,
            };
            if !closed_host_style_name(key) || !seen.insert(key.to_owned()) { return None; }
            let value = read(&property.value)?;
            entries.push(serde_json::json!([key, value]));
        }
        return Some(serde_json::json!({"kind":"style","entries":entries}));
    }
    None
}

fn closed_subtree_host<'a>(
    element: &JSXElement<'a>, read: &mut dyn FnMut(&Expression<'a>) -> Option<serde_json::Value>,
    keys: &mut BTreeSet<String>, count: &mut usize, depth: usize,
    has_aggregate: &mut bool, tuple_spans: &mut Vec<SourceSpan>,
) -> Option<serde_json::Value> {
    *count += 1;
    if *count > 256 || depth > 32 || element.opening_element.attributes.len() > 33 { return None; }
    let JSXElementName::Identifier(tag) = &element.opening_element.name else { return None; };
    let tag = tag.name.as_str();
    if !matches!(tag, "div" | "span" | "output" | "group" | "mesh") { return None; }
    let mut key = None;
    let mut props = Vec::<serde_json::Value>::new();
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
            let aggregate = (matches!(tag, "mesh" | "group") &&
                matches!(name, "position" | "rotation" | "scale")) ||
                (matches!(tag, "div" | "span" | "output") && name == "style");
            if (!aggregate && !closed_resource_subtree_property_name(tag, name)) ||
                !seen.insert(name.to_owned()) { return None; }
            let expression = if aggregate {
                let JSXAttributeValue::ExpressionContainer(container) = attribute.value.as_ref()? else { return None; };
                let expression = closed_host_aggregate_expression(
                    container.expression.as_expression()?, tag, name, read)?;
                if expression.get("kind").and_then(serde_json::Value::as_str) == Some("tuple") {
                    let expression_span = container.expression.as_expression()?.span();
                    tuple_spans.push(span(expression_span.start, expression_span.end));
                }
                *has_aggregate = true;
                expression
            } else {
                match attribute.value.as_ref()? {
                    JSXAttributeValue::StringLiteral(value) if !value.value.chars().any(|ch| matches!(ch, '&' | '\n' | '\r' | '\t')) =>
                        serde_json::json!({"kind":"literal","value":value.value.as_str()}),
                    JSXAttributeValue::ExpressionContainer(container) =>
                        read(container.expression.as_expression()?)?,
                    _ => return None,
                }
            };
            props.push(serde_json::json!([name, expression]));
        }
    }
    let key = key?;
    if !keys.insert(key.clone()) { return None; }
    let mut children = Vec::<serde_json::Value>::new();
    if element.children.len() > 256 { return None; }
    for child in &element.children {
        if closed_jsx_child_elided(child) { continue; }
        match child {
            JSXChild::Element(nested) => {
                let host = closed_subtree_host(nested, read, keys, count, depth + 1,
                    has_aggregate, tuple_spans)?;
                children.push(serde_json::json!({"kind":"host","host":host}));
            }
            JSXChild::ExpressionContainer(container) => {
                *count += 1;
                if *count > 256 { return None; }
                let expression = read(container.expression.as_expression()?)?;
                children.push(serde_json::json!({"kind":"text","expression":expression}));
            }
            _ => return None,
        }
    }
    Some(serde_json::json!({"tag":tag,"key":key,"props":props,"children":children}))
}

fn closed_resource_subtree_program<'a>(
    callable: &ClosedCallable<'a, '_>, component: &ComponentStateSiteIr,
    semantic: &Semantic<'a>, source: &str, revision: &str,
) -> Option<serde_json::Value> {
    if callable.params.items.len() != 1 || callable.params.rest.is_some() ||
        !component.state_sites.is_empty() || !component.effect_sites.is_empty() ||
        !component.collection_sites.is_empty() || component.store_sites.len() != 1 ||
        component.store_sites[0].hook_name != "use" { return None; }
    let parameter = &callable.params.items[0];
    if parameter.optional || parameter.initializer.is_some() { return None; }
    let (props_symbol, destructured) = match &parameter.pattern {
        BindingPattern::BindingIdentifier(identifier) => (identifier.symbol_id.get(), None),
        BindingPattern::ObjectPattern(pattern) if pattern.rest.is_none() && pattern.properties.len() == 1 => {
            let property = &pattern.properties[0];
            let BindingPattern::BindingIdentifier(local) = &property.value else { return None; };
            if property.computed { return None; }
            (None, Some((type_property_name(&property.key)?.to_owned(), local.symbol_id.get()?)))
        }
        _ => return None,
    };
    if callable.statements.len() != 2 { return None; }
    let declaration = match callable.statements.first()?.as_declaration()? {
        Declaration::VariableDeclaration(declaration)
            if declaration.kind == oxc_ast::ast::VariableDeclarationKind::Const && declaration.declarations.len() == 1 => declaration,
        _ => return None,
    };
    let declarator = &declaration.declarations[0];
    let BindingPattern::BindingIdentifier(value_binding) = &declarator.id else { return None; };
    let value_symbol = value_binding.symbol_id.get()?;
    let Expression::CallExpression(call) = declarator.init.as_ref()? else { return None; };
    if call.arguments.len() != 1 || component.store_sites[0].call.start != call.span.start ||
        component.store_sites[0].call.end != call.span.end { return None; }
    let resource_argument = call.arguments.first()?.as_expression()?;
    let resource_prop = if let Expression::StaticMemberExpression(member) = resource_argument {
        let Expression::Identifier(object) = &member.object else { return None; };
        if props_symbol.is_none() || reference_symbol(object, semantic) != props_symbol { return None; }
        member.property.name.to_string()
    } else if let Expression::Identifier(identifier) = resource_argument {
        let (name, symbol) = destructured.as_ref()?;
        if reference_symbol(identifier, semantic) != Some(*symbol) { return None; }
        name.clone()
    } else { return None; };
    if !resource_prop.bytes().next().is_some_and(|byte| byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$') ||
        !resource_prop.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'$') { return None; }
    let mut return_expression = callable.return_expression(1)?;
    while let Expression::ParenthesizedExpression(parenthesized) = return_expression {
        return_expression = &parenthesized.expression;
    }
    let Expression::JSXElement(element) = return_expression else { return None; };
    let mut keys = BTreeSet::new();
    let mut count = 0;
    let mut has_aggregate = false;
    let mut value_sites = BTreeMap::new();
    value_sites.insert(value_symbol, component.store_sites[0].site_id.clone());
    let source_sites = [component.store_sites[0].site_id.clone()];
    let mut read = |expression: &Expression<'a>| closed_store_host_expression(expression, &value_sites,
        &source_sites, semantic, source);
    let host = closed_subtree_host(element, &mut read,
        &mut keys, &mut count, 0, &mut has_aggregate,
        &mut Vec::new())?;
    Some(serde_json::json!({
        "schemaVersion": if has_aggregate { 3 } else { 2 },
        "componentProgramId": component.component_site_id,
        "moduleRevision": revision,
        "resourceUseSiteId": component.store_sites[0].site_id,
        "resourceProp": resource_prop,
        "host": host,
    }))
}

fn closed_store_host_property_name(tag: &str, name: &str) -> bool {
    match tag {
        "div" | "span" | "output" => {
            name.starts_with("data-") && name.len() >= 6 &&
            name.as_bytes()[5].is_ascii_lowercase() &&
            name[6..].bytes().all(|byte| byte.is_ascii_lowercase() ||
                byte.is_ascii_digit() || byte == b'-')
        }
        "mesh" | "group" => {
            matches!(name, "position-x" | "position-y" | "position-z" |
                "rotation-x" | "rotation-y" | "rotation-z" |
                "scale-x" | "scale-y" | "scale-z" | "visible")
        }
        _ => false,
    }
}

fn closed_store_host_expression<'a>(
    expression: &Expression<'a>, value_sites: &BTreeMap<SymbolId, String>,
    source_sites: &[String], semantic: &Semantic<'a>, source: &str,
) -> Option<serde_json::Value> {
    let expression_span = expression.span();
    let mut references = Vec::new();
    if !owner_update_program::visit_closed_primitive_expression(
        expression,
        owner_update_program::ClosedExpressionPolicy::Primitive,
        &mut |identifier| {
            let Some(site_id) = reference_symbol(identifier, semantic)
                .and_then(|symbol| value_sites.get(&symbol)) else { return false; };
            references.push(StateReference {
                start: identifier.span.start - expression_span.start,
                end: identifier.span.end - expression_span.start,
                site_id: site_id.clone(),
            });
            true
        },
    ) { return None; }
    let sink = Sink {
        owner_program_id: String::new(), sink_id: String::new(),
        source_sites: source_sites.to_vec(),
        expression: slice(source, span(expression_span.start, expression_span.end)).to_owned(),
        references,
    };
    let encoded = owner_update_program::closed_numeric_expression(&sink)?;
    serde_json::from_str(&encoded).ok()
}

struct StoreProjectionProof<'s, 'a> {
    semantic: &'s Semantic<'a>,
    bindings: BTreeMap<SymbolId, usize>,
    paths: Vec<Vec<Vec<String>>>,
    slots: Vec<(usize, usize)>,
    member_seen: bool,
}

impl<'s, 'a> StoreProjectionProof<'s, 'a> {
    fn input(&mut self, symbol: SymbolId, path: Vec<String>) -> Option<serde_json::Value> {
        let input = *self.bindings.get(&symbol)?;
        if !path.is_empty() { self.member_seen = true; }
        let paths = &mut self.paths[input];
        let path_index = if let Some(index) = paths.iter().position(|prior| *prior == path) {
            index
        } else {
            if paths.len() == 32 || self.slots.len() == 32 { return None; }
            paths.push(path);
            paths.len() - 1
        };
        let slot = if let Some(index) = self.slots.iter().position(|entry| *entry == (input, path_index)) {
            index
        } else {
            self.slots.push((input, path_index));
            self.slots.len() - 1
        };
        Some(serde_json::json!({"kind":"input","index":slot}))
    }

    fn expression(&mut self, expression: &Expression<'a>) -> Option<serde_json::Value> {
        let mut nodes = 0;
        self.visit(expression, &mut nodes, 0)
    }

    fn visit(&mut self, expression: &Expression<'a>, nodes: &mut usize,
        depth: usize) -> Option<serde_json::Value> {
        *nodes += 1;
        if depth > 32 || *nodes > 256 { return None; }
        match expression {
            Expression::NumericLiteral(value) if value.value.is_finite() =>
                Some(serde_json::json!({"kind":"literal","value":value.value})),
            Expression::StringLiteral(value) =>
                Some(serde_json::json!({"kind":"literal","value":value.value.as_str()})),
            Expression::BooleanLiteral(value) =>
                Some(serde_json::json!({"kind":"literal","value":value.value})),
            Expression::NullLiteral(_) => Some(serde_json::json!({"kind":"literal","value":null})),
            Expression::Identifier(identifier) =>
                self.input(reference_symbol(identifier, self.semantic)?, Vec::new()),
            Expression::StaticMemberExpression(_) => {
                let mut current = expression;
                let mut path = Vec::new();
                while let Expression::StaticMemberExpression(member) = current {
                    let field = member.property.name.as_str();
                    if matches!(field, "__proto__" | "prototype" | "constructor") ||
                        !field.bytes().next().is_some_and(|byte|
                            byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$') ||
                        !field.bytes().all(|byte|
                            byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'$') {
                        return None;
                    }
                    path.push(field.to_owned());
                    current = &member.object;
                }
                if path.len() > 8 { return None; }
                let Expression::Identifier(identifier) = current else { return None; };
                path.reverse();
                self.input(reference_symbol(identifier, self.semantic)?, path)
            }
            Expression::ParenthesizedExpression(value) =>
                self.visit(&value.expression, nodes, depth + 1),
            Expression::UnaryExpression(value) if matches!(value.operator,
                UnaryOperator::UnaryPlus | UnaryOperator::UnaryNegation |
                UnaryOperator::LogicalNot | UnaryOperator::BitwiseNot) => {
                let argument = self.visit(&value.argument, nodes, depth + 1)?;
                Some(serde_json::json!({"kind":"unary","operator":value.operator.as_str(),"argument":argument}))
            }
            Expression::BinaryExpression(value) if !matches!(value.operator,
                oxc_ast::ast::BinaryOperator::In | oxc_ast::ast::BinaryOperator::Instanceof) => {
                let left = self.visit(&value.left, nodes, depth + 1)?;
                let right = self.visit(&value.right, nodes, depth + 1)?;
                Some(serde_json::json!({"kind":"binary","operator":value.operator.as_str(),"left":left,"right":right}))
            }
            Expression::LogicalExpression(value) if matches!(value.operator,
                oxc_ast::ast::LogicalOperator::Or | oxc_ast::ast::LogicalOperator::And |
                oxc_ast::ast::LogicalOperator::Coalesce) => {
                let left = self.visit(&value.left, nodes, depth + 1)?;
                let right = self.visit(&value.right, nodes, depth + 1)?;
                Some(serde_json::json!({"kind":"logical","operator":value.operator.as_str(),"left":left,"right":right}))
            }
            Expression::ConditionalExpression(value) => {
                let test = self.visit(&value.test, nodes, depth + 1)?;
                let consequent = self.visit(&value.consequent, nodes, depth + 1)?;
                let alternate = self.visit(&value.alternate, nodes, depth + 1)?;
                Some(serde_json::json!({"kind":"conditional","test":test,
                    "consequent":consequent,"alternate":alternate}))
            }
            Expression::TemplateLiteral(value) => {
                let parts = value.quasis.iter().map(|quasi| quasi.value.cooked.as_ref()
                    .map(|value| value.as_str())).collect::<Option<Vec<_>>>()?;
                let mut expressions = Vec::with_capacity(value.expressions.len());
                for expression in &value.expressions {
                    expressions.push(self.visit(expression, nodes, depth + 1)?);
                }
                Some(serde_json::json!({"kind":"template","parts":parts,
                    "expressions":expressions}))
            }
            _ => None,
        }
    }

    fn finish(mut self, host: &mut serde_json::Value,
        inputs: &mut [serde_json::Value]) -> Option<()> {
        if !self.member_seen || self.paths.iter().any(Vec::is_empty) { return None; }
        let mut offsets = Vec::with_capacity(inputs.len());
        let mut offset = 0;
        for (index, paths) in self.paths.drain(..).enumerate() {
            offsets.push(offset);
            offset += paths.len();
            inputs[index]["paths"] = serde_json::json!(paths);
        }
        fn remap(value: &mut serde_json::Value, slots: &[(usize, usize)], offsets: &[usize]) {
            if value.get("kind").and_then(serde_json::Value::as_str) == Some("input") {
                let index = value["index"].as_u64().unwrap() as usize;
                let (input, path) = slots[index];
                value["index"] = serde_json::json!(offsets[input] + path);
            } else if let Some(values) = value.as_array_mut() {
                for child in values { remap(child, slots, offsets); }
            } else if let Some(values) = value.as_object_mut() {
                for child in values.values_mut() { remap(child, slots, offsets); }
            }
        }
        remap(host, &self.slots, &offsets);
        Some(())
    }
}

fn closed_store_host_program<'a>(
    callable: &ClosedCallable<'a, '_>, component: &ComponentStateSiteIr,
    semantic: &Semantic<'a>, source: &str, revision: &str,
) -> Option<(serde_json::Value, Vec<SourceSpan>)> {
    closed_store_host_program_inner(callable, component, semantic, source, revision, false)
        .or_else(|| closed_store_host_program_inner(callable, component, semantic, source, revision, true))
}

fn closed_store_host_program_inner<'a>(
    callable: &ClosedCallable<'a, '_>, component: &ComponentStateSiteIr,
    semantic: &Semantic<'a>, source: &str, revision: &str, projected: bool,
) -> Option<(serde_json::Value, Vec<SourceSpan>)> {
    let input_count = component.store_sites.len();
    if callable.params.items.len() != 1 ||
        callable.params.rest.is_some() || !component.state_sites.is_empty() ||
        !component.effect_sites.is_empty() || !component.collection_sites.is_empty() ||
        !(1..=8).contains(&input_count) || component.store_sites.iter().any(|site| site.hook_name != "use")
    { return None; }
    let parameter = &callable.params.items[0];
    if parameter.optional || parameter.initializer.is_some() { return None; }
    let (props_symbol, destructured) = match &parameter.pattern {
        BindingPattern::BindingIdentifier(identifier) => (identifier.symbol_id.get(), BTreeMap::new()),
        BindingPattern::ObjectPattern(pattern) if pattern.rest.is_none() &&
            !pattern.properties.is_empty() && pattern.properties.len() <= input_count => {
            let mut names = BTreeMap::new();
            for property in &pattern.properties {
                let BindingPattern::BindingIdentifier(local) = &property.value else { return None; };
                if property.computed { return None; }
                names.insert(local.symbol_id.get()?, type_property_name(&property.key)?.to_owned());
            }
            (None, names)
        }
        _ => return None,
    };
    if callable.statements.len() != input_count + 1 { return None; }
    let mut value_sites = BTreeMap::new();
    let mut projected_bindings = BTreeMap::new();
    let mut source_sites = Vec::new();
    let mut inputs = Vec::<serde_json::Value>::new();
    let mut used_destructured = BTreeSet::new();
    for index in 0..input_count {
        let declaration = match callable.statements.get(index)?.as_declaration()? {
            Declaration::VariableDeclaration(declaration)
                if declaration.kind == oxc_ast::ast::VariableDeclarationKind::Const &&
                    declaration.declarations.len() == 1 => declaration,
            _ => return None,
        };
        let declarator = &declaration.declarations[0];
        let BindingPattern::BindingIdentifier(value_binding) = &declarator.id else { return None; };
        let value_symbol = value_binding.symbol_id.get()?;
        let Expression::CallExpression(call) = declarator.init.as_ref()? else { return None; };
        let store_site = &component.store_sites[index];
        if call.arguments.len() != 1 || store_site.call.start != call.span.start ||
            store_site.call.end != call.span.end { return None; }
        let argument = call.arguments.first()?.as_expression()?;
        let store_prop = if let Expression::StaticMemberExpression(member) = argument {
            let Expression::Identifier(object) = &member.object else { return None; };
            if props_symbol.is_none() || reference_symbol(object, semantic) != props_symbol { return None; }
            member.property.name.to_string()
        } else if let Expression::Identifier(identifier) = argument {
            let symbol = reference_symbol(identifier, semantic)?;
            let name = destructured.get(&symbol)?;
            used_destructured.insert(symbol);
            name.clone()
        } else { return None; };
        if !store_prop.bytes().next().is_some_and(|byte| byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$') ||
            !store_prop.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'$') { return None; }
        source_sites.push(store_site.site_id.clone());
        value_sites.insert(value_symbol, store_site.site_id.clone());
        projected_bindings.insert(value_symbol, index);
        inputs.push(serde_json::json!({
            "storeUseSiteId": store_site.site_id, "storeProp": store_prop,
        }));
    }
    if props_symbol.is_none() && used_destructured.len() != destructured.len() { return None; }
    let mut return_expression = callable.return_expression(input_count)?;
    while let Expression::ParenthesizedExpression(parenthesized) = return_expression {
        return_expression = &parenthesized.expression;
    }
    let Expression::JSXElement(element) = return_expression else { return None; };
    if projected {
        let mut proof = StoreProjectionProof { semantic, bindings: projected_bindings,
            paths: vec![Vec::new(); input_count], slots: Vec::new(), member_seen: false };
        let mut keys = BTreeSet::new();
        let mut count = 0;
        let mut aggregate = false;
        let mut tuple_spans = Vec::new();
        let mut read = |expression: &Expression<'a>| proof.expression(expression);
        let mut host = closed_subtree_host(element, &mut read, &mut keys, &mut count,
            0, &mut aggregate, &mut tuple_spans)?;
        proof.finish(&mut host, &mut inputs)?;
        return Some((serde_json::json!({
            "schemaVersion": 5,
            "componentProgramId": component.component_site_id,
            "moduleRevision": revision,
            "inputs": inputs,
            "host": host,
        }), tuple_spans));
    }
    let shared_tree = || {
        if closed_jsx_children_empty(&element.children) && !element.opening_element.attributes.iter().any(|item| {
            matches!(item, JSXAttributeItem::Attribute(attribute)
                if matches!(&attribute.name, JSXAttributeName::Identifier(name) if name.name == "name") &&
                    matches!(attribute.value.as_ref(), Some(JSXAttributeValue::StringLiteral(_))))
        }) { return None; }
        let mut keys = BTreeSet::new();
        let mut count = 0;
        let mut has_aggregate = false;
        let mut tuple_spans = Vec::new();
        let mut read = |expression: &Expression<'a>| closed_store_host_expression(expression, &value_sites,
            &source_sites, semantic, source);
        let host = closed_subtree_host(element, &mut read,
            &mut keys, &mut count, 0, &mut has_aggregate,
            &mut tuple_spans)?;
        Some((serde_json::json!({
            "schemaVersion": 4,
            "componentProgramId": component.component_site_id,
            "moduleRevision": revision,
            "inputs": inputs,
            "host": host,
        }), tuple_spans))
    };
    if !closed_jsx_children_empty(&element.children) { return shared_tree(); }
    let legacy_leaf = (|| {
        let JSXElementName::Identifier(tag) = &element.opening_element.name else { return None; };
        let tag = tag.name.as_str();
        if !matches!(tag, "mesh" | "group" | "div" | "span" | "output") ||
            element.children.len() > 256 || !closed_jsx_children_empty(&element.children) ||
            element.opening_element.attributes.len() > 33 { return None; }
        let mut key = None;
        let mut props = Vec::<serde_json::Value>::new();
        let mut seen = BTreeSet::new();
        let mut tuple_spans = Vec::new();
        let mut has_aggregate = false;
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
                let aggregate = (matches!(tag, "mesh" | "group") &&
                    matches!(name, "position" | "rotation" | "scale")) ||
                    (matches!(tag, "div" | "span" | "output") && name == "style");
                if (!aggregate && !closed_store_host_property_name(tag, name)) ||
                    !seen.insert(name.to_owned()) { return None; }
                let JSXAttributeValue::ExpressionContainer(container) = attribute.value.as_ref()? else { return None; };
                let expression = container.expression.as_expression()?;
                let program = if aggregate {
                    let mut read = |expression: &Expression<'a>| closed_store_host_expression(expression,
                        &value_sites, &source_sites, semantic, source);
                    let program = closed_host_aggregate_expression(expression, tag, name,
                        &mut read)?;
                    has_aggregate = true;
                    if program.get("kind").and_then(serde_json::Value::as_str) == Some("tuple") {
                        let expression_span = expression.span();
                        tuple_spans.push(span(expression_span.start, expression_span.end));
                    }
                    program
                } else {
                    closed_store_host_expression(expression, &value_sites,
                        &source_sites, semantic, source)?
                };
                props.push(serde_json::json!([name, program]));
            }
        }
        if props.is_empty() || (tag == "span" && !has_aggregate) { return None; }
        let key = key?;
        let mut program = serde_json::json!({
            "componentProgramId": component.component_site_id,
            "moduleRevision": revision,
            "host": { "tag": tag, "key": key, "props": props, "child": null }
        });
        if has_aggregate {
            program["schemaVersion"] = serde_json::json!(3);
            program["inputs"] = serde_json::json!(inputs);
        } else if input_count == 1 {
            program["schemaVersion"] = serde_json::json!(1);
            program["storeUseSiteId"] = inputs[0]["storeUseSiteId"].clone();
            program["storeProp"] = inputs[0]["storeProp"].clone();
        } else {
            program["schemaVersion"] = serde_json::json!(2);
            program["inputs"] = serde_json::json!(inputs);
        }
        Some((program, tuple_spans))
    })();
    legacy_leaf.or_else(shared_tree)
}

struct ClosedStoreHostCollector<'p, 'a> {
    components: &'p [ComponentStateSiteIr],
    semantic: &'p Semantic<'a>,
    source: &'p str,
    revision: &'p str,
    programs: BTreeMap<String, serde_json::Value>,
    tuple_spans: BTreeMap<String, Vec<SourceSpan>>,
}

impl<'a> Visit<'a> for ClosedStoreHostCollector<'_, 'a> {
    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        if let Some(component) = self.components.iter().find(|component|
            component.declaration.start == node.span.start &&
            component.declaration.end == node.span.end)
            && let Some(callable) = ClosedCallable::function(node)
            && let Some((program, tuple_spans)) = closed_store_host_program(&callable, component,
                self.semantic, self.source, self.revision)
        {
            if !tuple_spans.is_empty() {
                self.tuple_spans.insert(component.component_site_id.clone(), tuple_spans);
            }
            self.programs.insert(component.component_site_id.clone(), program);
        }
        walk::walk_function(self, node, flags);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let BindingPattern::BindingIdentifier(binding) = &node.id
            && let Some(symbol) = binding.symbol_id.get()
            && let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
            && let Some(component) = self.components.iter().find(|component|
                component.arrow_initializer.as_ref().is_some_and(|at|
                    at.start == arrow.span.start && at.end == arrow.span.end))
            && let Some(callable) = ClosedCallable::arrow(arrow, symbol)
            && let Some((program, tuple_spans)) = closed_store_host_program(&callable, component,
                self.semantic, self.source, self.revision)
        {
            if !tuple_spans.is_empty() {
                self.tuple_spans.insert(component.component_site_id.clone(), tuple_spans);
            }
            self.programs.insert(component.component_site_id.clone(), program);
        }
        walk::walk_variable_declarator(self, node);
    }
}
struct ClosedResourceHostCollector<'p, 'a> {
    components: &'p [ComponentStateSiteIr],
    semantic: &'p Semantic<'a>,
    source: &'p str,
    revision: &'p str,
    programs: BTreeMap<String, serde_json::Value>,
}

impl<'a> Visit<'a> for ClosedResourceHostCollector<'_, 'a> {
    fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
        if let Some(component) = self.components.iter().find(|component| component.declaration.start == node.span.start && component.declaration.end == node.span.end)
            && let Some(callable) = ClosedCallable::function(node)
            && let Some(program) = closed_resource_host_program(&callable, component, self.semantic, self.revision)
                .or_else(|| closed_resource_subtree_program(&callable, component, self.semantic, self.source, self.revision))
        {
            self.programs.insert(component.component_site_id.clone(), program);
        }
        walk::walk_function(self, node, flags);
    }

    fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
        if let BindingPattern::BindingIdentifier(binding) = &node.id
            && let Some(symbol) = binding.symbol_id.get()
            && let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
            && let Some(component) = self.components.iter().find(|component|
                component.arrow_initializer.as_ref().is_some_and(|at|
                    at.start == arrow.span.start && at.end == arrow.span.end))
            && let Some(callable) = ClosedCallable::arrow(arrow, symbol)
            && let Some(program) = closed_resource_host_program(&callable, component, self.semantic, self.revision)
                .or_else(|| closed_resource_subtree_program(&callable, component, self.semantic, self.source, self.revision))
        {
            self.programs.insert(component.component_site_id.clone(), program);
        }
        walk::walk_variable_declarator(self, node);
    }
}

struct ClosedForwardEdge {
    program: serde_json::Value,
    child_name: String,
    child_site: String,
}

fn closed_forward_prop_name(name: &str) -> bool {
    name.bytes().next().is_some_and(|byte|
        byte.is_ascii_alphabetic() || byte == b'_' || byte == b'$') &&
        name.bytes().all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'$') &&
        !matches!(name, "key" | "ref" | "children" | "__proto__" | "constructor" | "prototype")
}

fn closed_forward_raw_jsx_string(raw: &str, value: &str) -> bool {
    !raw.chars().chain(value.chars()).any(|ch| matches!(ch, '&' | '\n' | '\r' | '\t'))
}

fn closed_forward_literal(expression: &Expression<'_>) -> Option<serde_json::Value> {
    match expression {
        Expression::ParenthesizedExpression(value) => closed_forward_literal(&value.expression),
        Expression::UnaryExpression(value) if matches!(value.operator,
            UnaryOperator::UnaryPlus | UnaryOperator::UnaryNegation) => {
            let Expression::NumericLiteral(number) = &value.argument else { return None; };
            let value = if value.operator == UnaryOperator::UnaryNegation {
                -number.value
            } else { number.value };
            value.is_finite().then(|| serde_json::json!(value))
        }
        _ => closed_resource_literal(expression),
    }
}

fn closed_component_forward_edge<'a>(
    callable: &ClosedCallable<'a, '_>, component: &ComponentStateSiteIr, semantic: &Semantic<'a>,
    symbols: &BTreeMap<SymbolId, (String, String)>, source: &str, revision: &str,
) -> Option<ClosedForwardEdge> {
    if callable.params.items.len() > 1 ||
        callable.params.rest.is_some() || !component.state_sites.is_empty() ||
        !component.effect_sites.is_empty() || !component.store_sites.is_empty() ||
        !component.collection_sites.is_empty() { return None; }
    let own_symbol = callable.own_symbol?;
    if symbols.get(&own_symbol)?.0 != component.name { return None; }
    let mut props_symbol = None;
    let mut destructured = BTreeMap::<SymbolId, String>::new();
    if let Some(parameter) = callable.params.items.first() {
        if parameter.optional || parameter.initializer.is_some() { return None; }
        match &parameter.pattern {
            BindingPattern::BindingIdentifier(identifier) => props_symbol = identifier.symbol_id.get(),
            BindingPattern::ObjectPattern(pattern) if pattern.rest.is_none() => {
                for property in &pattern.properties {
                    let BindingPattern::BindingIdentifier(local) = &property.value else { return None; };
                    if property.computed { return None; }
                    let name = type_property_name(&property.key)?;
                    if !closed_forward_prop_name(name) { return None; }
                    destructured.insert(local.symbol_id.get()?, name.to_owned());
                }
            }
            _ => return None,
        }
    }
    let mut output = callable.return_expression(0)?;
    while let Expression::ParenthesizedExpression(parenthesized) = output {
        output = &parenthesized.expression;
    }
    let Expression::JSXElement(element) = output else { return None; };
    if element.children.len() > 256 || !closed_jsx_children_empty(&element.children) ||
        element.opening_element.attributes.len() > 33 { return None; }
    let JSXElementName::IdentifierReference(target) = &element.opening_element.name else { return None; };
    let child_symbol = reference_symbol(target, semantic)?;
    let (child_name, child_site) = symbols.get(&child_symbol)?;
    if child_site == &component.component_site_id { return None; }
    let mut key = None;
    let mut seen = BTreeSet::new();
    let mut props = Vec::new();
    for attribute in &element.opening_element.attributes {
        let JSXAttributeItem::Attribute(attribute) = attribute else { return None; };
        let JSXAttributeName::Identifier(name) = &attribute.name else { return None; };
        let name = name.name.as_str();
        if name == "key" {
            if key.is_some() { return None; }
            let Some(JSXAttributeValue::StringLiteral(value)) = attribute.value.as_ref() else { return None; };
            if value.value.is_empty() || !closed_forward_raw_jsx_string(
                &slice(source, span(value.span.start, value.span.end)), value.value.as_str()) { return None; }
            key = Some(value.value.to_string());
            continue;
        }
        if props.len() == 32 || !closed_forward_prop_name(name) ||
            !seen.insert(name.to_owned()) { return None; }
        let expression = match attribute.value.as_ref()? {
            JSXAttributeValue::StringLiteral(value) if closed_forward_raw_jsx_string(
                &slice(source, span(value.span.start, value.span.end)), value.value.as_str()) =>
                serde_json::json!({"kind":"literal","value":value.value.as_str()}),
            JSXAttributeValue::ExpressionContainer(container) => {
                let mut expression = container.expression.as_expression()?;
                while let Expression::ParenthesizedExpression(parenthesized) = expression {
                    expression = &parenthesized.expression;
                }
                if let Expression::StaticMemberExpression(member) = expression {
                    let Expression::Identifier(object) = &member.object else { return None; };
                    if props_symbol.is_none() || reference_symbol(object, semantic) != props_symbol ||
                        !closed_forward_prop_name(member.property.name.as_str()) { return None; }
                    serde_json::json!({"kind":"prop","name":member.property.name.as_str()})
                } else if let Expression::Identifier(identifier) = expression {
                    let source = destructured.get(&reference_symbol(identifier, semantic)?)?;
                    serde_json::json!({"kind":"prop","name":source})
                } else {
                    serde_json::json!({"kind":"literal","value":closed_forward_literal(expression)?})
                }
            }
            _ => return None,
        };
        props.push(serde_json::json!([name, expression]));
    }
    Some(ClosedForwardEdge {
        program: serde_json::json!({
            "schemaVersion": 1,
            "componentProgramId": component.component_site_id,
            "moduleRevision": revision,
            "childComponentProgramId": child_site,
            "key": key,
            "props": props,
        }),
        child_name: child_name.clone(), child_site: child_site.clone(),
    })
}

fn closed_component_forward_programs<'a>(
    program: &oxc_ast::ast::Program<'a>, components: &[ComponentStateSiteIr],
    semantic: &Semantic<'a>, source: &str, revision: &str,
    closed_resources: &BTreeMap<String, serde_json::Value>,
    closed_stores: &BTreeMap<String, serde_json::Value>,
) -> BTreeMap<String, ClosedForwardEdge> {
    struct Symbols<'s, 'a> {
        semantic: &'s Semantic<'a>,
        components: &'s [ComponentStateSiteIr],
        names: BTreeMap<SymbolId, (String, String)>,
        direct_eval: bool,
    }
    impl<'a> Visit<'a> for Symbols<'_, 'a> {
        fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
            if let Some(component) = self.components.iter().find(|component|
                component.declaration.start == node.span.start &&
                component.declaration.end == node.span.end)
                && let Some(symbol) = node.id.as_ref().and_then(|id| id.symbol_id.get())
                && self.semantic.scoping().symbol_scope_id(symbol) ==
                    self.semantic.scoping().root_scope_id()
                && self.semantic.scoping().symbol_declarations(symbol).count() == 1
                && self.semantic.scoping().get_resolved_references(symbol).all(|reference|
                    !reference.is_write())
            {
                self.names.insert(symbol,
                    (component.name.clone(), component.component_site_id.clone()));
            }
            walk::walk_function(self, node, flags);
        }
        fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
            if let BindingPattern::BindingIdentifier(binding) = &node.id
                && let Some(symbol) = binding.symbol_id.get()
                && let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
                && let Some(component) = self.components.iter().find(|component|
                    component.arrow_initializer.as_ref().is_some_and(|at|
                        at.start == arrow.span.start && at.end == arrow.span.end))
                && self.semantic.scoping().symbol_scope_id(symbol) ==
                    self.semantic.scoping().root_scope_id()
                && self.semantic.scoping().symbol_declarations(symbol).count() == 1
                && self.semantic.scoping().get_resolved_references(symbol).all(|reference|
                    !reference.is_write())
            {
                self.names.insert(symbol,
                    (component.name.clone(), component.component_site_id.clone()));
            }
            walk::walk_variable_declarator(self, node);
        }
        fn visit_call_expression(&mut self, node: &CallExpression<'a>) {
            let mut callee = &node.callee;
            while let Expression::ParenthesizedExpression(parenthesized) = callee {
                callee = &parenthesized.expression;
            }
            if matches!(callee, Expression::Identifier(identifier) if identifier.name == "eval") {
                self.direct_eval = true;
            }
            walk::walk_call_expression(self, node);
        }
    }
    let mut symbols = Symbols { semantic, components, names: BTreeMap::new(), direct_eval: false };
    symbols.visit_program(program);
    if symbols.direct_eval { return BTreeMap::new(); }
    struct Edges<'s, 'a> {
        semantic: &'s Semantic<'a>,
        components: &'s [ComponentStateSiteIr],
        names: &'s BTreeMap<SymbolId, (String, String)>,
        source: &'s str,
        revision: &'s str,
        edges: BTreeMap<String, ClosedForwardEdge>,
    }
    impl<'a> Visit<'a> for Edges<'_, 'a> {
        fn visit_function(&mut self, node: &Function<'a>, flags: ScopeFlags) {
            if let Some(component) = self.components.iter().find(|component|
                component.declaration.start == node.span.start &&
                component.declaration.end == node.span.end)
                && let Some(callable) = ClosedCallable::function(node)
                && let Some(edge) = closed_component_forward_edge(&callable, component,
                    self.semantic, self.names, self.source, self.revision)
            {
                self.edges.insert(component.component_site_id.clone(), edge);
            }
            walk::walk_function(self, node, flags);
        }
        fn visit_variable_declarator(&mut self, node: &VariableDeclarator<'a>) {
            if let BindingPattern::BindingIdentifier(binding) = &node.id
                && let Some(symbol) = binding.symbol_id.get()
                && let Some(Expression::ArrowFunctionExpression(arrow)) = node.init.as_ref()
                && let Some(component) = self.components.iter().find(|component|
                    component.arrow_initializer.as_ref().is_some_and(|at|
                        at.start == arrow.span.start && at.end == arrow.span.end))
                && let Some(callable) = ClosedCallable::arrow(arrow, symbol)
                && let Some(edge) = closed_component_forward_edge(&callable, component,
                    self.semantic, self.names, self.source, self.revision)
            {
                self.edges.insert(component.component_site_id.clone(), edge);
            }
            walk::walk_variable_declarator(self, node);
        }
    }
    let mut collector = Edges { semantic, components, names: &symbols.names, source, revision,
        edges: BTreeMap::new() };
    collector.visit_program(program);
    fn reaches_closed_leaf(site: &str, edges: &BTreeMap<String, ClosedForwardEdge>,
        resources: &BTreeMap<String, serde_json::Value>,
        stores: &BTreeMap<String, serde_json::Value>,
        visited: &mut BTreeSet<String>, depth: usize) -> bool {
        if resources.contains_key(site) || stores.contains_key(site) { return true; }
        if depth == 8 || !visited.insert(site.to_owned()) { return false; }
        let result = edges.get(site).is_some_and(|edge| reaches_closed_leaf(
            &edge.child_site, edges, resources, stores, visited, depth + 1));
        visited.remove(site);
        result
    }
    let edges = collector.edges;
    edges.iter().filter(|(site, _)| reaches_closed_leaf(site, &edges,
        closed_resources, closed_stores, &mut BTreeSet::new(), 0))
        .map(|(site, edge)| (site.clone(), ClosedForwardEdge {
            program: edge.program.clone(), child_name: edge.child_name.clone(),
            child_site: edge.child_site.clone(),
        })).collect()
}

fn transform_native_component_source(
    path: &str,
    source: &str,
    revision: &str,
    plan: &ComponentStateSitesPlan,
    prop_edits: &[(
        SourceSpan,
        String,
        String,
        bool,
        Option<usize>,
        Option<String>,
    )],
    numeric_programs: &[Sink],
    prop_sites: &BTreeMap<String, BTreeSet<String>>,
    numeric_primitive_props: &BTreeMap<String, BTreeSet<String>>,
    state_layouts: &BTreeMap<String, Vec<NativeStateLayoutSlotMetadata>>,
    closed_resource_programs: &BTreeMap<String, serde_json::Value>,
    closed_store_programs: &BTreeMap<String, serde_json::Value>,
    closed_forward_programs: &BTreeMap<String, ClosedForwardEdge>,
    closed_store_tuple_spans: &BTreeMap<String, Vec<SourceSpan>>,
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
        "__nativeOwnerCutKernels".to_owned(),
        "__nativeStabilizeHostTuple".to_owned(),
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
    let tuple_helper_import = if closed_store_tuple_spans.is_empty() {
        String::new()
    } else {
        format!(", stabilizeHostTuple as {}", aliases[10])
    };
    let helper_import = format!(
        "\nimport {{ defineComponent as {}, useStateAt as {}, useEffectAt as {}, useStoreAt as {}, bindStatePropsAt as {}, renderCollectionAt as {}, useAt as {}, bindStatePropAt as {}{} }} from {module};",
        aliases[0],
        aliases[1],
        aliases[2],
        aliases[3],
        aliases[4],
        aliases[5],
        aliases[6],
        aliases[7],
        tuple_helper_import
    );
    let numeric_program_table = if numeric_programs.is_empty() {
        String::new()
    } else {
        let descriptors = numeric_programs
            .iter()
            .map(|program| {
                let owner_program_id = serde_json::to_string(&program.owner_program_id).unwrap_or_default();
                let sink_id = serde_json::to_string(&program.sink_id).unwrap_or_default();
                let source_sites = program.source_sites
                    .iter()
                    .map(|site| serde_json::to_string(site).unwrap_or_default())
                    .collect::<Vec<_>>()
                    .join(", ");
                let closed_expression = owner_update_program::closed_numeric_expression(program)
                    .map(|expression| format!("closedExpression: {expression}, "))
                    .unwrap_or_default();
                format!("{{ schemaVersion: 2, ownerProgramId: {owner_program_id}, sinkId: {sink_id}, {closed_expression}sourceSites: [{source_sites}] }}")
            })
            .collect::<Vec<_>>()
            .join(", ");
        format!("\nconst {} = [{descriptors}] as const;", aliases[8])
    };
    let (owner_kernel_table, owner_kernel_indices) =
        emit_primitive_owner_cut_kernels(numeric_programs, state_layouts, &aliases[9], &module);
    let mut edits = Vec::new();
    let mut registrations = String::new();
    for component in &plan.components {
        if let Some(tuple_spans) = closed_store_tuple_spans.get(&component.component_site_id) {
            for tuple_span in tuple_spans {
                edits.push(TextEdit {
                    start: tuple_span.start as usize,
                    end: tuple_span.start as usize,
                    replacement: format!("{}(", aliases[10]),
                });
                edits.push(TextEdit {
                    start: tuple_span.end as usize,
                    end: tuple_span.end as usize,
                    replacement: ")".to_owned(),
                });
            }
        }
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
        let primitive_props_option = numeric_primitive_props
            .get(&component.component_site_id)
            .filter(|props| !props.is_empty())
            .map(|props| format!(", numericPrimitiveProps: [{}]", props.iter()
                .map(|name| serde_json::to_string(name).unwrap_or_default())
                .collect::<Vec<_>>().join(", ")))
            .unwrap_or_default();
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
                    ", stateLayout: {{ schemaVersion: 1, programId: {site}, moduleRevision: {}, slots: [{slots}] }}",
                    serde_json::to_string(revision).unwrap_or_default()
                )
            })
            .unwrap_or_default();
        let closed_resource_option = closed_resource_programs
            .get(&component.component_site_id)
            .map(|program| format!(", closedResourceHostProgram: {program}"))
            .unwrap_or_default();
        let closed_store_option = closed_store_programs
            .get(&component.component_site_id)
            .map(|program| format!(", closedStoreHostProgram: {program}"))
            .unwrap_or_default();
        let closed_forward_option = closed_forward_programs
            .get(&component.component_site_id)
            .map(|edge| {
                let mut program = edge.program.to_string();
                program.pop();
                program.push_str(",\"childComponent\":");
                program.push_str(&edge.child_name);
                program.push('}');
                format!(", closedComponentForwardProgram: {program}")
            })
            .unwrap_or_default();
        let owner_kernel_option = owner_kernel_indices
            .get(&component.component_site_id)
            .map(|index| format!(", ownerUpdateProgram: {}[{index}]", aliases[9]))
            .unwrap_or_default();
        let closed_collection_option = component.collection_sites.iter()
            .filter(|site| !site.requires_owner_render)
            .map(|site| serde_json::to_string(&site.site_id).unwrap_or_default())
            .collect::<Vec<_>>();
        let closed_collection_option = if component.collection_sites.is_empty() { String::new() }
            else { format!(", closedCollectionSites: [{}]", closed_collection_option.join(", ")) };
        let options = format!(
            "{{ propOnlySites: [{}]{}{}{}{}{}{}{}{} }}",
            sites,
            primitive_props_option,
            if component.host_leaf_output {
                ", hostLeafOutput: true"
            } else {
                ""
            },
            state_layout_option,
            owner_kernel_option,
            closed_resource_option,
            closed_store_option,
            closed_forward_option,
            closed_collection_option,
        );
        if let Some(arrow) = &component.arrow_initializer {
            edits.push(TextEdit {
                start: arrow.start as usize,
                end: arrow.start as usize,
                replacement: format!("{}({}, ({{ {}: ", aliases[0], site, component.name),
            });
            edits.push(TextEdit {
                start: arrow.end as usize,
                end: arrow.end as usize,
                replacement: format!(" }}).{}, {options})", component.name),
            });
        } else {
            registrations.push_str(&format!(
                "\n{}({}, {}, {options});", aliases[0], site, component.name,
            ));
        }
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
    for (prop_span, prefix, suffix, singular, descriptor_index, expression_override) in prop_edits {
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
        if let Some(expression) = expression_override {
            edits.push(TextEdit {
                start: prop_span.start as usize,
                end: prop_span.end as usize,
                replacement: expression.clone(),
            });
        }
    }
    edits.push(TextEdit {
        start: import_span.end as usize,
        end: import_span.end as usize,
        replacement: format!(
            "{helper_import}{numeric_program_table}{owner_kernel_table}{registrations}"
        ),
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

fn compiler_target_platform_arch(target: &str) -> Result<(&'static str, &'static str), String> {
    let platform = if target.ends_with("-apple-darwin") {
        "darwin"
    } else if target.contains("-linux-") {
        "linux"
    } else if target.contains("-windows-") {
        "win32"
    } else {
        return Err(format!("unsupported compiler target platform: {target}"));
    };
    let arch = if target.starts_with("aarch64-") {
        "arm64"
    } else if target.starts_with("x86_64-") {
        "x64"
    } else if target.starts_with("i686-") || target.starts_with("i586-") {
        "ia32"
    } else {
        return Err(format!("unsupported compiler target architecture: {target}"));
    };
    Ok((platform, arch))
}

fn compiler_info(target: &str) -> Result<serde_json::Value, String> {
    let (platform, arch) = compiler_target_platform_arch(target)?;
    Ok(serde_json::json!({
        "schemaVersion": 1,
        "protocolVersion": 1,
        "target": target,
        "platform": platform,
        "arch": arch,
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

fn run() -> Result<(), String> {
    if env::args().nth(1).as_deref() == Some("--compiler-info") {
        if env::args().len() != 2 {
            return Err("usage: ui-graph-compiler-spike --compiler-info".to_owned());
        }
        println!("{}", compiler_info(env!("R3ACT_COMPILER_TARGET"))?);
        return Ok(());
    }
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
            current_declaration_is_single: false,
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
            unsupported_arrow_components: BTreeMap::new(),
            jsx_component_references: BTreeSet::new(),
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

    #[test]
    fn compiler_info_reports_embedded_target_and_bounded_node_labels() {
        let embedded = env!("R3ACT_COMPILER_TARGET");
        let info = compiler_info(embedded).unwrap();
        assert_eq!(info["schemaVersion"], 1);
        assert_eq!(info["protocolVersion"], 1);
        assert_eq!(info["target"], embedded);
        assert_eq!(info["version"], env!("CARGO_PKG_VERSION"));
        assert_eq!(info.as_object().unwrap().len(), 6);
        for (target, platform, arch) in [
            ("aarch64-apple-darwin", "darwin", "arm64"),
            ("x86_64-unknown-linux-gnu", "linux", "x64"),
            ("i686-unknown-linux-musl", "linux", "ia32"),
            ("x86_64-pc-windows-msvc", "win32", "x64"),
        ] {
            assert_eq!(compiler_target_platform_arch(target).unwrap(), (platform, arch));
        }
        assert!(compiler_info("aarch64-apple-ios").is_err());
        assert!(compiler_info("wasm32-unknown-unknown").is_err());
    }

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

    fn emitted_state_layout_revision(code: &str, program_id: &str) -> String {
        let marker = format!(
            "stateLayout: {{ schemaVersion: 1, programId: {}, moduleRevision: ",
            serde_json::to_string(program_id).unwrap()
        );
        let rest = code.split_once(&marker).expect("state layout metadata missing").1;
        let literal = rest.split_once(", slots:").expect("state layout slots missing").0;
        serde_json::from_str(literal).expect("state layout revision is not a JSON string")
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
        assert_eq!(
            emitted_state_layout_revision(&code, "state-layout-eligibility.tsx#component:Example"),
            plan.module_revision
        );
        assert!(code.contains("slots: [{ siteId: \"state-layout-eligibility.tsx#component:Example#state:0\", slot: 0 }, { siteId: \"state-layout-eligibility.tsx#component:Example#state:1\", slot: 1 }, { siteId: \"state-layout-eligibility.tsx#component:Example#state:2\", slot: 2 }] }"));
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
        let first_component = &first_plan.components.as_ref().unwrap()[0];
        let second_component = &second_plan.components.as_ref().unwrap()[0];
        assert!(first_component.state_layout.is_none());
        assert!(first_component.prop_only_sites.is_empty());
        assert_eq!(first_component.state_sites.len(), 2);
        for (index, site) in first_component.state_sites.iter().enumerate() {
            assert_eq!(site.site_id,
                format!("state-layout-conditional.tsx#component:Conditional#state:{index}"));
            assert_eq!(site.site_id, second_component.state_sites[index].site_id);
        }
        assert!(first_plan.component_module.unwrap().contains(
            "__nativeBindStatePropAt(\"state-layout-conditional.tsx#component:Conditional#state:1\""));

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
        assert_eq!(
            emitted_state_layout_revision(&code, "state-layout-collision.tsx#component:Collision"),
            plan.module_revision
        );
        assert!(code.contains("slots: [{ siteId: \"state-layout-collision.tsx#component:Collision#state:0\", slot: 0 }] }"));

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
        assert_eq!(
            emitted_state_layout_revision(&repeated_code, "state-layout-empty.tsx#component:Empty"),
            repeated_read.module_revision
        );
        assert!(repeated_code.contains("slots: [{ siteId: \"state-layout-empty.tsx#component:Empty#state:0\", slot: 0 }] }"));
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
        assert_eq!(row.numeric_primitive_props, vec!["id", "session"]);
        let slots = &row.state_layout.as_ref().unwrap().slots;
        assert_eq!(slots.len(), 3);
        assert_eq!(row.state_sites.len(), 3);
        for (index, site) in row.state_sites.iter().enumerate() {
            assert_eq!(slots[index].slot, index);
            assert_eq!(slots[index].site_id, site.site_id);
            assert_eq!(
                site.site_id,
                format!(
                    "src/browser/native_product_mixed_arm.tsx#component:ProductMixedRow#state:{index}"
                )
            );
        }
        let code = product.component_module.unwrap();
        assert!(code.contains("numericPrimitiveProps: [\"id\", \"session\"]"));
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
        for module in ["@compiled-ui/runtime", "@compiled-ui/runtime/core", "@r3act/core"] {
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
        assert!(!is_native_runtime_module("@r3act/host-dom"));
        assert!(!is_native_runtime_module("react"));
    }

    #[test]
    fn emits_ordered_joint_store_host_program_with_symbol_mapped_inputs() {
        let response = compile_state(
            "native-joint-store-host.tsx",
            include_str!("../../fixtures/native-joint-store-host.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let components = plan.components.unwrap();
        for (name, props) in [
            ("Joint", vec!["position", "camera"]),
            ("Destructured", vec!["position", "camera"]),
            ("SameStoreTwice", vec!["position", "position"]),
            ("DestructuredTwice", vec!["position", "position"]),
        ] {
            let component = components.iter().find(|component| component.name == name).unwrap();
            let program = component.closed_store_host_program.as_ref().unwrap();
            assert_eq!(program["schemaVersion"], 2);
            assert_eq!(program["componentProgramId"], component.component_site_id);
            assert_eq!(program["moduleRevision"], revision);
            assert_eq!(program["inputs"].as_array().unwrap().len(), 2);
            for (index, prop) in props.iter().enumerate() {
                assert_eq!(program["inputs"][index]["storeUseSiteId"],
                    component.store_sites[index].site_id);
                assert_eq!(program["inputs"][index]["storeProp"], *prop);
            }
        }
        let joint = components.iter().find(|component| component.name == "Joint").unwrap();
        let program = joint.closed_store_host_program.as_ref().unwrap();
        assert_eq!(program["host"]["props"][0][1], serde_json::json!({
            "kind":"binary","operator":"+",
            "left":{"kind":"input","index":0},
            "right":{"kind":"input","index":1}
        }));
        assert_eq!(program["host"]["props"][1][1]["kind"], "conditional");
        for component in components.iter().filter(|component| !matches!(
            component.name.as_str(), "Joint" | "Destructured" | "SameStoreTwice" | "DestructuredTwice"
        )) {
            assert!(component.closed_store_host_program.is_none(),
                "{} unexpectedly closed", component.name);
        }
        let code = plan.component_module.unwrap();
        assert_eq!(code.matches("closedStoreHostProgram:").count(), 4);
        assert!(code.contains("\"schemaVersion\":2"));
    }

    #[test]
    fn emits_structured_store_host_values_and_stabilizes_only_eligible_tuples() {
        let source = r#"import { use } from "native_runtime_api.ts";
const __nativeStabilizeHostTuple = "authored";
export function Single(props) { const x = use(props.store); return <mesh key="single" position={[x, 0, 1]} rotation={[(x + 1), 0, 0]} visible={x > 0}/>; }
export function Joint({ a, b }) { const x = use(a); const y = use(b); return <group key="joint" scale={[x, y, 1]} position-x={x + y}/>; }
export function Styled(props) { const x = use(props.store); return <span key="styled" data-label={x} style={{ color: "red", "background-color": x, "--gap": x + 1, opacity: null }}/>; }
export function Primitive(props) { const x = use(props.store); return <div key="plain" data-value={x}/>; }
export function Generic(props) { const x = use(props.store); return <mesh key="generic" position={props.position} visible={x > 0}/>; }"#;
        let response = compile_state("structured-store.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let code = plan.component_module.as_ref().unwrap();
        let components = plan.components.as_ref().unwrap();
        let single = components.iter().find(|component| component.name == "Single").unwrap();
        let single_program = single.closed_store_host_program.as_ref().unwrap();
        assert_eq!(single_program["schemaVersion"], 3);
        assert_eq!(single_program["moduleRevision"], revision);
        assert_eq!(single_program["inputs"].as_array().unwrap().len(), 1);
        assert_eq!(single_program["inputs"][0]["storeUseSiteId"], single.store_sites[0].site_id);
        assert_eq!(single_program["host"]["props"][0][1]["kind"], "tuple");
        assert_eq!(single_program["host"]["props"][1][1]["kind"], "tuple");
        let joint = components.iter().find(|component| component.name == "Joint").unwrap();
        let joint_program = joint.closed_store_host_program.as_ref().unwrap();
        assert_eq!(joint_program["schemaVersion"], 3);
        assert_eq!(joint_program["inputs"].as_array().unwrap().len(), 2);
        assert_eq!(joint_program["host"]["props"][0][1]["items"][0],
            serde_json::json!({"kind":"input","index":0}));
        assert_eq!(joint_program["host"]["props"][0][1]["items"][1],
            serde_json::json!({"kind":"input","index":1}));
        let styled = components.iter().find(|component| component.name == "Styled").unwrap();
        let style = &styled.closed_store_host_program.as_ref().unwrap()["host"]["props"][1][1];
        assert_eq!(style["kind"], "style");
        assert_eq!(style["entries"].as_array().unwrap().len(), 4);
        assert_eq!(style["entries"][1][0], "background-color");
        assert_eq!(style["entries"][2][0], "--gap");
        assert_eq!(components.iter().find(|component| component.name == "Primitive").unwrap()
            .closed_store_host_program.as_ref().unwrap()["schemaVersion"], 1);
        assert!(components.iter().find(|component| component.name == "Generic").unwrap()
            .closed_store_host_program.is_none());
        assert!(code.contains("stabilizeHostTuple as __nativeStabilizeHostTuple_"), "{code}");
        assert_eq!(code.matches("__nativeStabilizeHostTuple_(").count(), 3, "{code}");
        assert!(code.contains("position={__nativeStabilizeHostTuple_([x, 0, 1])}"), "{code}");
        assert!(code.contains("scale={__nativeStabilizeHostTuple_([x, y, 1])}"), "{code}");
        assert!(code.contains("position={props.position}"), "{code}");
    }

    #[test]
    fn emits_bounded_structured_store_projection_paths_in_lexical_input_order() {
        let source = r#"import { use } from "native_runtime_api.ts";
export function Projected(props) {
  const position = use(props.position);
  const camera = use(props.camera);
  return <group key="root"><mesh key="mesh" position={[camera.eye.y, position.x, position.y]} rotation={[position.x + camera.eye.x, 0, 0]}/><output key="label" style={{opacity: camera.zoom / 10}}>{`${position.x}:${camera.eye.y}`}</output></group>;
}
export function Scalar(props) { const x = use(props.store); return <div key="scalar" data-x={x}/>; }
export function ExistingTree(props) { const x = use(props.store); return <div key="tree"><span key="leaf">{x}</span></div>; }"#;
        let response = compile_state("structured-projection.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let components = plan.components.as_ref().unwrap();
        let projected = components.iter().find(|item| item.name == "Projected").unwrap();
        let program = projected.closed_store_host_program.as_ref().unwrap();
        assert_eq!(program["schemaVersion"], 5);
        assert_eq!(program["inputs"][0]["paths"], serde_json::json!([["x"], ["y"]]));
        assert_eq!(program["inputs"][1]["paths"],
            serde_json::json!([["eye", "y"], ["eye", "x"], ["zoom"]]));
        assert_eq!(program["host"]["children"][0]["host"]["props"][0][1]["items"][0],
            serde_json::json!({"kind":"input","index":2}));
        assert_eq!(program["host"]["children"][0]["host"]["props"][0][1]["items"][1],
            serde_json::json!({"kind":"input","index":0}));
        assert_eq!(components.iter().find(|item| item.name == "Scalar").unwrap()
            .closed_store_host_program.as_ref().unwrap()["schemaVersion"], 1);
        assert_eq!(components.iter().find(|item| item.name == "ExistingTree").unwrap()
            .closed_store_host_program.as_ref().unwrap()["schemaVersion"], 4);
        assert!(plan.component_module.unwrap().contains("stabilizeHostTuple as"));
    }

    #[test]
    fn structured_store_projection_declines_hidden_or_unsafe_reads_and_exceeded_bounds() {
        for expression in [
            "value[position]", "value?.position", "value.position?.x",
            "value.__proto__", "value.constructor", "value.prototype",
            "value.position + callback(() => value.other)",
            "value.position + props.other", "value.position + other",
            "value.a.b.c.d.e.f.g.h.i",
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const value = use(props.store); return <output key=\"out\" data-value={{{expression}}}/>; }}");
            let response = compile_state("rejected-projection.tsx", &source);
            assert!(response.error.is_none(), "{expression}: {:?}", response.error);
            assert!(response.plan.unwrap().components.as_ref().unwrap()[0]
                .closed_store_host_program.is_none(), "{expression} unexpectedly closed");
        }
        let unused = "import { use } from \"native_runtime_api.ts\"; export function Candidate(props) { const x = use(props.first); const y = use(props.second); return <output key=\"out\" data-x={x.value}/>; }";
        let response = compile_state("unused-projection.tsx", unused);
        assert!(response.error.is_none());
        assert!(response.plan.unwrap().components.as_ref().unwrap()[0]
            .closed_store_host_program.is_none());
        for count in [32, 33] {
            let expression = (0..count).map(|index| format!("value.field{index}"))
                .collect::<Vec<_>>().join(" + ");
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const value = use(props.store); return <output key=\"out\" data-value={{{expression}}}/>; }}");
            let response = compile_state(&format!("projection-{count}.tsx"), &source);
            assert!(response.error.is_none(), "{count}: {:?}", response.error);
            assert_eq!(response.plan.unwrap().components.as_ref().unwrap()[0]
                .closed_store_host_program.as_ref().map(|value| value["schemaVersion"].as_u64()),
                if count == 32 { Some(Some(5)) } else { None }, "{count}");
        }
        for depth in [8, 9] {
            let path = (0..depth).map(|index| format!("field{index}"))
                .collect::<Vec<_>>().join(".");
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const value = use(props.store); return <output key=\"out\" data-value={{value.{path}}}/>; }}");
            let response = compile_state(&format!("projection-depth-{depth}.tsx"), &source);
            assert!(response.error.is_none(), "{depth}: {:?}", response.error);
            assert_eq!(response.plan.unwrap().components.as_ref().unwrap()[0]
                .closed_store_host_program.as_ref().map(|value| value["schemaVersion"].as_u64()),
                if depth == 8 { Some(Some(5)) } else { None }, "{depth}");
        }
    }

    #[test]
    fn joint_resource_and_store_fields_share_ordered_lexical_provenance() {
        let response = compile_state("native-joint-async-inputs.tsx",
            include_str!("../../fixtures/native-joint-async-inputs.tsx"));
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let code = plan.component_module.as_ref().unwrap();
        let components = plan.components.as_ref().unwrap();
        for (direct, destructured, paths, first_index) in [
            ("Dom", "DomDestructured", serde_json::json!([
                [["sample", "y"], ["sample", "x"]],
                [["vector", "x"], ["vector", "y"]],
                [["sample", "x"], ["sample", "y"]],
            ]), 4),
            ("Three", "ThreeDestructured", serde_json::json!([
                [["sample", "y"], ["sample", "x"]],
                [["vector", "x"]],
                [["sample", "x"]],
            ]), 3),
        ] {
            let owner = components.iter().find(|item| item.name == direct).unwrap();
            let other = components.iter().find(|item| item.name == destructured).unwrap();
            let program = owner.closed_store_host_program.as_ref().unwrap();
            let other_program = other.closed_store_host_program.as_ref().unwrap();
            assert_eq!(program["schemaVersion"], 5);
            assert_eq!(program["componentProgramId"], owner.component_site_id);
            assert_eq!(program["moduleRevision"], revision);
            assert_eq!(program["host"], other_program["host"]);
            assert_eq!(program["inputs"].as_array().unwrap().len(), 3);
            assert_eq!(program["inputs"].as_array().unwrap().iter().map(|input|
                input["storeProp"].as_str().unwrap()).collect::<Vec<_>>(),
                ["second", "position", "first"]);
            assert_eq!(program["inputs"].as_array().unwrap().iter().map(|input|
                input["paths"].clone()).collect::<Vec<_>>(),
                paths.as_array().unwrap().clone());
            for (index, input) in program["inputs"].as_array().unwrap().iter().enumerate() {
                assert_eq!(input.as_object().unwrap().len(), 3,
                    "compiler must not infer a source kind from an authored name");
                assert_eq!(input["storeUseSiteId"], owner.store_sites[index].site_id);
                assert_eq!(other_program["inputs"][index]["storeUseSiteId"],
                    other.store_sites[index].site_id);
                assert_eq!(input["storeProp"], other_program["inputs"][index]["storeProp"]);
            }
            let expression = &program["host"]["children"][0]["host"]["props"][0][1];
            let first = if direct == "Dom" { &expression["left"]["left"] }
                else { &expression["items"][0] };
            assert_eq!(first, &serde_json::json!({"kind":"input","index":first_index}));
            assert!(owner.closed_resource_host_program.is_none());
        }
        assert!(code.contains("stabilizeHostTuple as __nativeStabilizeHostTuple_"));
        assert!(code.contains("position={__nativeStabilizeHostTuple_([a.sample.x, p.vector.x, b.sample.y])}"));
        assert!(code.contains("position={__nativeStabilizeHostTuple_([p.vector.x + a.sample.x, b.sample.x, 0])}"));
        assert_eq!(code.matches("__nativeStabilizeHostTuple_(").count(), 4);
    }

    #[test]
    fn joint_projection_declines_hidden_callback_optional_and_getter_shapes() {
        for expression in [
            "resource.sample[x] + state.vector.x", "resource?.sample.x + state.vector.x",
            "resource.sample?.x + state.vector.x",
            "resource.sample.x + callback(() => state.vector.x)",
            "resource.sample.x + props.hidden", "resource.sample.x + other",
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const resource = use(props.resource); const state = use(props.store); return <output key=\"out\" data-value={{{expression}}}/>; }}");
            let response = compile_state("joint-unsafe.tsx", &source);
            assert!(response.error.is_none(), "{expression}: {:?}", response.error);
            assert!(response.plan.unwrap().components.as_ref().unwrap()[0]
                .closed_store_host_program.is_none(), "{expression} unexpectedly closed");
        }
        let source = "import { use } from \"native_runtime_api.ts\"; export function Candidate(props) { const resource = use(props.resource); const state = use(props.store); return <output key=\"out\" style={{ get opacity() { return resource.sample.x + state.vector.x; } }}/>; }";
        let response = compile_state("joint-getter.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        assert!(response.plan.unwrap().components.as_ref().unwrap()[0]
            .closed_store_host_program.is_none());
    }

    #[test]
    fn emits_bounded_component_forwarding_with_symbol_provenance_and_function_refs() {
        let response = compile_state("native-component-forwarding.tsx",
            include_str!("../../fixtures/native-component-forwarding.tsx"));
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let code = plan.component_module.as_ref().unwrap();
        let components = plan.components.as_ref().unwrap();
        for (name, child, key, props) in [
            ("DomOuter", "DomMiddle", "dom-middle", ["secondary", "motion", "primary"]),
            ("DomMiddle", "Dom", "dom-leaf", ["second", "position", "first"]),
            ("ThreeOuter", "ThreeMiddle", "three-middle", ["secondary", "motion", "primary"]),
            ("ThreeMiddle", "Three", "three-leaf", ["second", "position", "first"]),
        ] {
            let component = components.iter().find(|item| item.name == name).unwrap();
            let child_component = components.iter().find(|item| item.name == child).unwrap();
            let forward = component.closed_component_forward_program.as_ref().unwrap();
            assert_eq!(forward["schemaVersion"], 1);
            assert_eq!(forward["componentProgramId"], component.component_site_id);
            assert_eq!(forward["moduleRevision"], revision);
            assert_eq!(forward["childComponentProgramId"], child_component.component_site_id);
            assert_eq!(forward["key"], key);
            assert_eq!(forward["props"].as_array().unwrap().len(), 3);
            assert!(forward.get("childComponent").is_none(),
                "serializable plan must not contain a function ref");
            for (index, source) in props.iter().enumerate() {
                assert_eq!(forward["props"][index][1],
                    serde_json::json!({"kind":"prop","name":source}));
            }
            assert!(code.contains(&format!("\"childComponent\":{child}")));
        }
        for name in ["Dom", "Three", "OpaqueTraced", "HealthDom", "HealthThree"] {
            assert!(components.iter().find(|item| item.name == name).unwrap()
                .closed_component_forward_program.is_none(), "{name} unexpectedly closed");
        }
        assert_eq!(components.iter().find(|item| item.name == "Dom").unwrap()
            .closed_store_host_program.as_ref().unwrap()["schemaVersion"], 5);
        assert_eq!(components.iter().find(|item| item.name == "Three").unwrap()
            .closed_store_host_program.as_ref().unwrap()["schemaVersion"], 5);
        assert_eq!(code.matches("closedComponentForwardProgram:").count(), 4);
        let source = "import { use } from \"native_runtime_api.ts\"; function Leaf(props) { const x = use(props.store); return <output key=\"leaf\" data-value={x}/>; } function LiteralWrapper({ source }) { return <Leaf store={source} flag={true} zero={0} minus={-2} empty={null} label=\"ok\"/>; }";
        let response = compile_state("forward-literals.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let wrapper = response.plan.unwrap().components.unwrap().into_iter()
            .find(|item| item.name == "LiteralWrapper").unwrap();
        let program = wrapper.closed_component_forward_program.unwrap();
        assert!(program["key"].is_null());
        assert_eq!(program["props"], serde_json::json!([
            ["store", {"kind":"prop","name":"source"}],
            ["flag", {"kind":"literal","value":true}],
            ["zero", {"kind":"literal","value":0.0}],
            ["minus", {"kind":"literal","value":-2.0}],
            ["empty", {"kind":"literal","value":null}],
            ["label", {"kind":"literal","value":"ok"}],
        ]));
    }

    #[test]
    fn component_forwarding_rejects_opaque_bindings_and_overdeep_chains() {
        let prefix = "import { use } from \"native_runtime_api.ts\"; function Leaf(props) { const x = use(props.store); return <output key=\"leaf\" data-value={x}/>; }";
        for (count, accepted) in [(32, true), (33, false)] {
            let fields = (0..count - 1).map(|index| format!(" field{index}={{1}}"))
                .collect::<String>();
            let source = format!("{prefix} function Wrapper(props) {{ return <Leaf store={{props.store}}{fields}/>; }}");
            let response = compile_state(&format!("forward-{count}-props.tsx"), &source);
            assert!(response.error.is_none(), "{count}: {:?}", response.error);
            let wrapper = response.plan.unwrap().components.unwrap().into_iter()
                .find(|item| item.name == "Wrapper").unwrap();
            assert_eq!(wrapper.closed_component_forward_program.is_some(), accepted,
                "{count} forwarded props");
        }
        for (name, attributes) in [
            ("key-entity", "key=\"a&amp;b\" store={props.store}"),
            ("key-newline", "key=\"a\nb\" store={props.store}"),
            ("key-return", "key=\"a\rb\" store={props.store}"),
            ("key-tab", "key=\"a\tb\" store={props.store}"),
            ("prop-entity", "store={props.store} label=\"a&amp;b\""),
            ("prop-newline", "store={props.store} label=\"a\nb\""),
            ("prop-return", "store={props.store} label=\"a\rb\""),
            ("prop-tab", "store={props.store} label=\"a\tb\""),
        ] {
            let source = format!("{prefix} function Wrapper(props) {{ return <Leaf {attributes}/>; }}");
            let response = compile_state(&format!("forward-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let wrapper = response.plan.unwrap().components.unwrap().into_iter()
                .find(|item| item.name == "Wrapper").unwrap();
            assert!(wrapper.closed_component_forward_program.is_none(),
                "{name} unexpectedly closed");
        }
        for (name, wrapper, suffix) in [
            ("callback", "function Wrapper(props) { return <Leaf key=\"w\" store={helper(props.store)}/>; }", ""),
            ("spread", "function Wrapper(props) { return <Leaf key=\"w\" {...props}/>; }", ""),
            ("ref", "function Wrapper(props) { return <Leaf key=\"w\" ref={props.ref} store={props.store}/>; }", ""),
            ("children", "function Wrapper(props) { return <Leaf key=\"w\" store={props.store}>child</Leaf>; }", ""),
            ("branch", "function Wrapper(props) { if (props.flag) return <Leaf key=\"w\" store={props.store}/>; return <Leaf key=\"w\" store={props.store}/>; }", ""),
            ("effect", "function Wrapper(props) { log(props); return <Leaf key=\"w\" store={props.store}/>; }", ""),
            ("shadow", "function Wrapper(Leaf) { return <Leaf key=\"w\" store={1}/>; }", ""),
            ("reassigned", "function Wrapper(props) { return <Leaf key=\"w\" store={props.store}/>; }", "Leaf = replacement;"),
            ("destructuring-write", "function Wrapper(props) { return <Leaf key=\"w\" store={props.store}/>; }", "({ Leaf } = replacement);"),
            ("increment-write", "function Wrapper(props) { return <Leaf key=\"w\" store={props.store}/>; }", "++Leaf;"),
            ("eval", "function Wrapper(props) { return <Leaf key=\"w\" store={props.store}/>; }", "function unrelated() { eval('0'); }"),
        ] {
            let source = format!("{prefix} {wrapper} {suffix}");
            let response = compile_state(&format!("forward-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let wrapper = response.plan.unwrap().components.unwrap().into_iter()
                .find(|item| item.name == "Wrapper").unwrap();
            assert!(wrapper.closed_component_forward_program.is_none(),
                "{name} unexpectedly closed");
        }
        for (name, before, wrapper) in [
            ("imported", "import { Leaf } from './foreign.tsx';", "function Wrapper(props) { return <Leaf key=\"w\" store={props.store}/>; }"),
            ("qualified", "const foreign = { Leaf };", "function Wrapper(props) { return <foreign.Leaf key=\"w\" store={props.store}/>; }"),
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; {before} function LeafLocal(props) {{ const x = use(props.store); return <output key=\"leaf\" data-value={{x}}/>; }} {wrapper}");
            let response = compile_state(&format!("forward-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap().into_iter()
                .find(|item| item.name == "Wrapper").unwrap()
                .closed_component_forward_program.is_none(), "{name} unexpectedly closed");
        }
        let cycle = "import { use } from \"native_runtime_api.ts\"; function A(props) { return <B key=\"b\" x={props.x}/>; } function B(props) { return <A key=\"a\" x={props.x}/>; }";
        let response = compile_state("forward-cycle.tsx", cycle);
        assert!(response.error.is_none(), "{:?}", response.error);
        assert!(response.plan.unwrap().components.unwrap().iter().all(|component|
            component.closed_component_forward_program.is_none()));
        let chain = (0..9).map(|index| format!("function Wrap{index}(props) {{ return <{} key=\"w{index}\" store={{props.store}}/>; }}",
            if index == 8 { "Leaf".to_owned() } else { format!("Wrap{}", index + 1) }))
            .collect::<Vec<_>>().join(" ");
        let response = compile_state("forward-depth.tsx", &format!("{prefix} {chain}"));
        assert!(response.error.is_none(), "{:?}", response.error);
        let components = response.plan.unwrap().components.unwrap();
        assert!(components.iter().find(|item| item.name == "Wrap0").unwrap()
            .closed_component_forward_program.is_none());
        assert!(components.iter().find(|item| item.name == "Wrap1").unwrap()
            .closed_component_forward_program.is_some());
    }

    #[test]
    fn structured_store_styles_keep_the_resource_field_limit_and_need_no_tuple_helper() {
        for (count, accepted) in [(32, true), (33, false)] {
            let entries = (0..count).map(|index| format!("\"--field-{index}\": x"))
                .collect::<Vec<_>>().join(", ");
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Styled(props) {{ const x = use(props.store); return <output key=\"styled\" style={{{{{entries}}}}}/>; }}");
            let response = compile_state(&format!("store-style-{count}.tsx"), &source);
            assert!(response.error.is_none(), "{count}: {:?}", response.error);
            let plan = response.plan.unwrap();
            assert_eq!(plan.components.as_ref().unwrap()[0].closed_store_host_program.as_ref()
                .and_then(|program| program["schemaVersion"].as_u64()),
                if accepted { Some(3) } else { None }, "{count}");
            assert!(!plan.component_module.unwrap().contains("stabilizeHostTuple as"));
        }
    }

    #[test]
    fn structured_store_host_values_decline_unsafe_syntax_without_tuple_import() {
        for (name, prop) in [
            ("tuple-length", "<mesh key=\"leaf\" position={[x, 1]}/>"),
            ("tuple-spread", "<mesh key=\"leaf\" position={[x, ...other]}/>"),
            ("tuple-hole", "<mesh key=\"leaf\" position={[x, , 1]}/>"),
            ("tuple-call", "<mesh key=\"leaf\" position={[x, read(), 1]}/>"),
            ("tuple-capture", "<mesh key=\"leaf\" position={[x, other, 1]}/>"),
            ("tuple-read", "<mesh key=\"leaf\" position={[x, props.other, 1]}/>"),
            ("tuple-dom", "<div key=\"leaf\" position={[x, 0, 1]}/>"),
            ("style-spread", "<div key=\"leaf\" style={{ color: x, ...other }}/>"),
            ("style-computed", "<div key=\"leaf\" style={{ [other]: x }}/>"),
            ("style-getter", "<div key=\"leaf\" style={{ get color() { return x; } }}/>"),
            ("style-method", "<div key=\"leaf\" style={{ color() { return x; } }}/>"),
            ("style-shorthand", "<div key=\"leaf\" style={{ x }}/>"),
            ("style-call", "<div key=\"leaf\" style={{ color: choose(x) }}/>"),
            ("style-duplicate", "<div key=\"leaf\" style={{ color: x, color: 1 }}/>"),
            ("style-prototype", "<div key=\"leaf\" style={{ __proto__: x }}/>"),
            ("style-unsafe-name", "<div key=\"leaf\" style={{ \"--bad;name\": x }}/>"),
            ("style-three", "<mesh key=\"leaf\" style={{ color: x }}/>"),
            ("extra-prop-read", "<div key=\"leaf\" style={{ color: props.other }}/>"),
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const x = use(props.store); return {prop}; }}");
            let response = compile_state(&format!("store-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let plan = response.plan.unwrap();
            assert!(plan.components.as_ref().unwrap()[0].closed_store_host_program.is_none(),
                "{name} unexpectedly closed");
            assert!(!plan.component_module.unwrap().contains("stabilizeHostTuple as"),
                "{name} unexpectedly imported tuple helper");
        }
    }

    #[test]
    fn primitive_store_schemas_do_not_import_tuple_helper() {
        let response = compile_state("primitive-store.tsx",
            "import { use } from \"native_runtime_api.ts\"; export function One(props) { const x = use(props.store); return <div key=\"one\" data-x={x}/>; } export function Two(props) { const x = use(props.a); const y = use(props.b); return <group key=\"two\" position-x={x + y}/>; }");
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let components = plan.components.as_ref().unwrap();
        assert_eq!(components[0].closed_store_host_program.as_ref().unwrap()["schemaVersion"], 1);
        assert_eq!(components[1].closed_store_host_program.as_ref().unwrap()["schemaVersion"], 2);
        assert!(!plan.component_module.unwrap().contains("stabilizeHostTuple as"));
    }

    #[test]
    fn generic_tuple_after_extra_render_work_is_not_stabilized() {
        let source = "import { use } from \"native_runtime_api.ts\"; export function Generic(props) { const x = use(props.store); const other = props.other; return <mesh key=\"generic\" position={[x, other, 1]}/>; }";
        let response = compile_state("generic-store-tuple.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert!(plan.components.as_ref().unwrap()[0].closed_store_host_program.is_none());
        let code = plan.component_module.unwrap();
        assert!(code.contains("position={[x, other, 1]}"), "{code}");
        assert!(!code.contains("stabilizeHostTuple as"));
    }

    #[test]
    fn emits_closed_store_host_program_for_bounded_direct_numeric_uses_and_leaf_values() {
        let response = compile_state(
            "native-closed-store-host.tsx",
            include_str!("../../fixtures/native-closed-store-host.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let components = plan.components.unwrap();
        let mesh = components.iter().find(|component| component.name == "Mesh").unwrap();
        let mesh_program = mesh.closed_store_host_program.as_ref().unwrap();
        assert_eq!(mesh_program["schemaVersion"], 1);
        assert_eq!(mesh_program["componentProgramId"], mesh.component_site_id);
        assert_eq!(mesh_program["moduleRevision"], revision);
        assert_eq!(mesh_program["storeUseSiteId"], mesh.store_sites[0].site_id);
        assert_eq!(mesh_program["storeProp"], "position");
        assert_eq!(mesh_program["host"], serde_json::json!({
            "tag": "mesh", "key": "mesh", "props": [
                ["position-x", {"kind":"binary","operator":"*",
                    "left":{"kind":"input","index":0},
                    "right":{"kind":"literal","value":2.0}}],
                ["visible", {"kind":"binary","operator":">",
                    "left":{"kind":"input","index":0},
                    "right":{"kind":"literal","value":0.0}}]
            ], "child": null
        }));
        let dom = components.iter().find(|component| component.name == "Dom").unwrap();
        let dom_program = dom.closed_store_host_program.as_ref().unwrap();
        assert_eq!(dom_program["storeProp"], "store");
        assert_eq!(dom_program["host"]["tag"], "div");
        assert_eq!(dom_program["host"]["props"][0][0], "data-value");
        assert_eq!(dom_program["host"]["props"][0][1]["kind"], "conditional");
        let multi = components.iter().find(|component| component.name == "MultipleHooks").unwrap();
        let multi_program = multi.closed_store_host_program.as_ref().unwrap();
        assert_eq!(multi_program["schemaVersion"], 2);
        assert_eq!(multi_program["componentProgramId"], multi.component_site_id);
        assert_eq!(multi_program["moduleRevision"], revision);
        assert_eq!(multi_program["inputs"], serde_json::json!([
            {"storeUseSiteId": multi.store_sites[0].site_id, "storeProp": "store"},
            {"storeUseSiteId": multi.store_sites[1].site_id, "storeProp": "other"},
        ]));
        assert_eq!(multi_program["host"]["props"][0][1], serde_json::json!({
            "kind":"binary","operator":"+",
            "left":{"kind":"input","index":0},
            "right":{"kind":"input","index":1}
        }));
        let style = components.iter().find(|component| component.name == "Style").unwrap();
        let style_program = style.closed_store_host_program.as_ref().unwrap();
        assert_eq!(style_program["schemaVersion"], 3);
        assert_eq!(style_program["componentProgramId"], style.component_site_id);
        assert_eq!(style_program["moduleRevision"], revision);
        assert_eq!(style_program["inputs"], serde_json::json!([
            {"storeUseSiteId": style.store_sites[0].site_id, "storeProp": "store"},
        ]));
        assert_eq!(style_program["host"], serde_json::json!({
            "tag": "div", "key": "x", "props": [["style", {
                "kind": "style", "entries": [["opacity", {"kind": "input", "index": 0}]]
            }]], "child": null
        }));
        for component in components.iter().filter(|component|
            !matches!(component.name.as_str(), "Mesh" | "Dom" | "MultipleHooks" | "Style")) {
            assert!(component.closed_store_host_program.is_none(),
                "{} unexpectedly closed", component.name);
        }
        let code = plan.component_module.unwrap();
        assert_eq!(code.matches("closedStoreHostProgram:").count(), 4);
        assert!(code.contains("closedStoreHostProgram: {"));
    }

    #[test]
    fn named_three_store_leaf_uses_shared_closed_tree_without_widening_dynamic_name() {
        let source = "import { use } from \"native_runtime_api.ts\"; \
            export function Cursor(props) { const x = use(props.point); \
            return <mesh key=\"cursor\" name=\"cursor\" position={[x, 0, 0]} />; }";
        let response = compile_state("named-three-store-leaf.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let component = &plan.components.as_ref().unwrap()[0];
        let program = component.closed_store_host_program.as_ref().unwrap();
        assert_eq!(program["schemaVersion"], 4);
        assert_eq!(program["inputs"][0]["storeProp"], "point");
        assert_eq!(program["host"]["tag"], "mesh");
        assert_eq!(program["host"]["key"], "cursor");
        assert_eq!(program["host"]["props"][0], serde_json::json!([
            "name", {"kind":"literal", "value":"cursor"}
        ]));
        assert_eq!(program["host"]["props"][1][0], "position");
        assert_eq!(program["host"]["props"][1][1]["kind"], "tuple");
        assert_eq!(program["host"]["props"][1][1]["items"][0],
            serde_json::json!({"kind":"input", "index":0}));
        let code = plan.component_module.unwrap();
        assert!(code.contains("stabilizeHostTuple as __nativeStabilizeHostTuple"));
        assert!(code.contains("position={__nativeStabilizeHostTuple([x, 0, 0])}"));
        for (name, attributes) in [
            ("dynamic-name", "name={x} position={[x, 0, 0]}"),
            ("name-call", "name={helper(x)} position={[x, 0, 0]}"),
            ("spread", "name=\"cursor\" position={[x, 0, 0]} {...props}"),
            ("position-call", "name=\"cursor\" position={[x, helper(), 0]}"),
            ("position-getter", "name=\"cursor\" position={[x, props.value, 0]}"),
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; \
                export function Candidate(props) {{ const x = use(props.point); \
                return <mesh key=\"cursor\" {attributes} />; }}");
            let response = compile_state(&format!("named-three-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let component = &response.plan.unwrap().components.unwrap()[0];
            assert!(component.closed_store_host_program.is_none(), "{name} unexpectedly closed");
        }
    }

    #[test]
    fn emits_fixed_store_subtrees_with_ordered_inputs_and_nested_tuple_provenance() {
        let response = compile_state("native-store-subtree.tsx",
            include_str!("../../fixtures/native-store-subtree.tsx"));
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let code = plan.component_module.as_ref().unwrap();
        let components = plan.components.as_ref().unwrap();
        let dom = components.iter().find(|component| component.name == "DomTree").unwrap();
        let dom_program = dom.closed_store_host_program.as_ref().unwrap();
        assert_eq!(dom_program["schemaVersion"], 4);
        assert_eq!(dom_program["componentProgramId"], dom.component_site_id);
        assert_eq!(dom_program["moduleRevision"], revision);
        assert_eq!(dom_program["inputs"], serde_json::json!([
            {"storeUseSiteId": dom.store_sites[0].site_id, "storeProp": "left"},
            {"storeUseSiteId": dom.store_sites[1].site_id, "storeProp": "right"},
        ]));
        assert_eq!(dom_program["host"]["tag"], "div");
        assert_eq!(dom_program["host"]["key"], "dom-root");
        assert_eq!(dom_program["host"]["props"], serde_json::json!([]));
        assert_eq!(dom_program["host"]["children"][0]["kind"], "host");
        assert_eq!(dom_program["host"]["children"][0]["host"]["children"][0]["kind"], "text");
        assert_eq!(dom_program["host"]["children"][0]["host"]["props"][0][1]["entries"][1][1],
            serde_json::json!({"kind":"binary","operator":"+",
                "left":{"kind":"input","index":1},
                "right":{"kind":"literal","value":1.0}}));
        assert_eq!(dom_program["host"]["children"][1]["host"]["children"][0]["expression"],
            serde_json::json!({"kind":"binary","operator":"+",
                "left":{"kind":"input","index":0},"right":{"kind":"input","index":1}}));
        let three = components.iter().find(|component| component.name == "ThreeTree").unwrap();
        let three_program = three.closed_store_host_program.as_ref().unwrap();
        assert_eq!(three_program["schemaVersion"], 4);
        assert_eq!(three_program["moduleRevision"], revision);
        assert_eq!(three_program["inputs"], serde_json::json!([
            {"storeUseSiteId": three.store_sites[0].site_id, "storeProp": "position"},
            {"storeUseSiteId": three.store_sites[1].site_id, "storeProp": "angle"},
        ]));
        assert_eq!(three_program["host"]["children"][0]["host"]["props"][0][1]["kind"], "tuple");
        assert_eq!(three_program["host"]["children"][0]["host"]["props"][0][1]["items"][1],
            serde_json::json!({"kind":"input","index":1}));
        assert_eq!(three_program["host"]["children"][1]["host"]["props"][0][1]["kind"], "tuple");
        for component in components.iter().filter(|component| !matches!(component.name.as_str(),
            "DomTree" | "ThreeTree")) {
            assert!(component.closed_store_host_program.is_none(), "{} unexpectedly closed", component.name);
        }
        assert_eq!(code.matches("closedStoreHostProgram:").count(), 2);
        assert!(code.contains("stabilizeHostTuple as __nativeStabilizeHostTuple"), "{code}");
        assert_eq!(code.matches("__nativeStabilizeHostTuple(").count(), 3, "{code}");
        assert!(code.contains("position={__nativeStabilizeHostTuple([x, y, 1])}"), "{code}");
        assert!(code.contains("rotation={__nativeStabilizeHostTuple([0, y, 0])}"), "{code}");
        assert!(code.contains("scale={__nativeStabilizeHostTuple([x, 1, 1])}"), "{code}");
        assert!(code.contains("position={[x, helper(), 1]}"), "{code}");
    }

    #[test]
    fn fixed_store_subtree_declines_unsafe_whole_proofs_without_tuple_helper() {
        for (name, child) in [
            ("event", "<mesh key=\"child\" position={[x, 0, 1]} onClick={() => x}/>"),
            ("ref", "<mesh key=\"child\" position={[x, 0, 1]} ref={props.ref}/>"),
            ("spread", "<mesh key=\"child\" position={[x, 0, 1]} {...props}/>"),
            ("capture", "<mesh key=\"child\" position={[x, other, 1]}/>"),
            ("getter", "<div key=\"child\" style={{ get opacity() { return x; } }}/>"),
            ("fragment", "<><mesh key=\"child\" position={[x, 0, 1]}/></>"),
            ("component", "<Other key=\"child\" value={x}/>"),
            ("duplicate", "<mesh key=\"root\" position={[x, 0, 1]}/>"),
            ("text-call", "<span key=\"child\">{helper(x)}</span>"),
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const x = use(props.store); return <group key=\"root\">{child}</group>; }}");
            let response = compile_state(&format!("store-subtree-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let plan = response.plan.unwrap();
            assert!(plan.components.as_ref().unwrap()[0].closed_store_host_program.is_none(),
                "{name} unexpectedly closed");
            assert!(!plan.component_module.unwrap().contains("stabilizeHostTuple as"),
                "{name} unexpectedly imported tuple helper");
        }
    }

    #[test]
    fn fixed_store_subtree_enforces_tree_depth_and_total_node_bounds() {
        for (name, depth, accepted) in [("depth-32", 32, true), ("depth-33", 33, false)] {
            let open = (0..depth).map(|index| format!("<div key=\"deep-{index}\">"))
                .collect::<String>();
            let child = format!("{open}{{x}}{}", "</div>".repeat(depth));
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const x = use(props.store); return <div key=\"root\">{child}</div>; }}");
            let response = compile_state(&format!("store-subtree-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let component = response.plan.unwrap().components.unwrap().remove(0);
            assert_eq!(component.closed_store_host_program.as_ref().map(|program|
                program["schemaVersion"].as_u64()),
                if accepted { Some(Some(4)) } else { None }, "{name}");
        }
        for (name, child_count, accepted) in [("nodes-256", 255, true), ("nodes-257", 256, false)] {
            let child = (0..child_count).map(|index| format!("<span key=\"child-{index}\"/>"))
                .collect::<String>();
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export function Candidate(props) {{ const x = use(props.store); return <div key=\"root\">{child}</div>; }}");
            let response = compile_state(&format!("store-subtree-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let component = response.plan.unwrap().components.unwrap().remove(0);
            assert_eq!(component.closed_store_host_program.as_ref().map(|program|
                program["schemaVersion"].as_u64()),
                if accepted { Some(Some(4)) } else { None }, "{name}");
        }
    }

    #[test]
    fn emits_closed_resource_host_program_only_for_single_use_literal_leaf() {
        let source = include_str!("../../fixtures/native-closed-resource-host.tsx");
        let response = compile_state("native-closed-resource-host.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let components = plan.components.unwrap();
        for (name, key, prop) in [
            ("Ready", "b-primary", "resource"),
            ("Destructured", "b-other", "resource"),
        ] {
            let component = components.iter().find(|component| component.name == name).unwrap();
            let program = component.closed_resource_host_program.as_ref().unwrap();
            assert_eq!(program["schemaVersion"], 1);
            assert_eq!(program["componentProgramId"], component.component_site_id);
            assert_eq!(program["moduleRevision"], revision);
            assert_eq!(program["resourceUseSiteId"], component.store_sites[0].site_id);
            assert_eq!(program["resourceProp"], prop);
            assert_eq!(program["host"], serde_json::json!({
                "tag": "div", "key": key, "props": [["data-b", if name == "Ready" { "primary" } else { "other" }]],
                "child": "resource-value"
            }));
        }
        let dynamic = components.iter().find(|component| component.name == "DynamicProp").unwrap();
        let program = dynamic.closed_resource_host_program.as_ref().unwrap();
        assert_eq!(program["schemaVersion"], 2);
        assert_eq!(program["host"]["props"][0][1], serde_json::json!({
            "kind":"input","index":0
        }));
        for component in components.iter().filter(|component| !matches!(
            component.name.as_str(), "Ready" | "Destructured" | "DynamicProp")) {
            assert!(component.closed_resource_host_program.is_none(), "{} unexpectedly closed", component.name);
        }
        let code = plan.component_module.unwrap();
        assert_eq!(code.matches("closedResourceHostProgram:").count(), 3);
        assert!(code.contains("closedResourceHostProgram: {"));
        assert!(code.contains("\"moduleRevision\":"));
    }

    #[test]
    fn emits_bounded_closed_resource_host_subtree_only_for_direct_primitive_use() {
        let source = include_str!("../../fixtures/native-resource-subtree.tsx");
        let response = compile_state("native-resource-subtree.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let components = plan.components.unwrap();
        for (name, prop, tag, key) in [
            ("DomTree", "resource", "div", "dom-root"),
            ("ThreeTree", "resource", "group", "three-root"),
        ] {
            let component = components.iter().find(|component| component.name == name).unwrap();
            let program = component.closed_resource_host_program.as_ref().unwrap();
            assert_eq!(program["schemaVersion"], 2);
            assert_eq!(program["componentProgramId"], component.component_site_id);
            assert_eq!(program["moduleRevision"], revision);
            assert_eq!(program["resourceUseSiteId"], component.store_sites[0].site_id);
            assert_eq!(program["resourceProp"], prop);
            assert_eq!(program["host"]["tag"], tag);
            assert_eq!(program["host"]["key"], key);
            assert_eq!(program["host"]["children"].as_array().unwrap().len(), 2);
        }
        let dom = components.iter().find(|component| component.name == "DomTree").unwrap();
        let host = &dom.closed_resource_host_program.as_ref().unwrap()["host"];
        assert_eq!(host["children"][0]["host"]["children"][0], serde_json::json!({
            "kind":"text", "expression":{"kind":"input","index":0}
        }));
        assert_eq!(host["children"][1]["host"]["props"][0][1], serde_json::json!({
            "kind":"binary","operator":"+",
            "left":{"kind":"input","index":0},
            "right":{"kind":"literal","value":1.0}
        }));
        let three = components.iter().find(|component| component.name == "ThreeTree").unwrap();
        let host = &three.closed_resource_host_program.as_ref().unwrap()["host"];
        assert_eq!(host["children"][0]["host"]["props"][0][0], "position-x");
        assert_eq!(host["children"][1]["host"]["props"][0][1], serde_json::json!({
            "kind":"literal","value":"static"
        }));
        for component in components.iter().filter(|component|
            component.name != "DomTree" && component.name != "ThreeTree") {
            assert!(component.closed_resource_host_program.is_none(),
                "{} unexpectedly closed", component.name);
        }
        let code = plan.component_module.unwrap();
        assert_eq!(code.matches("closedResourceHostProgram:").count(), 2);
    }

    #[test]
    fn emits_schema_three_resource_host_values_only_for_literal_aggregates() {
        let source = r#"
import { use } from "native_runtime_api.ts";
export function Styled(props) {
  const value = use(props.resource);
  return <div key="styled" data-kind="ready"><span key="styled-child" style={{ color: value, "background-color": "red", "--gap": value + 1, opacity: 0.5 }}>{value}</span></div>;
}
export function Positioned({ resource }) {
  const value = use(resource);
  return <group key="positioned"><mesh key="positioned-mesh" position={[value, value + 1, 2]} rotation={[0, value, 0]} scale={[1, 1, 1]}/></group>;
}
export function Primitive(props) {
  const value = use(props.resource);
  return <div key="primitive"><output key="primitive-child" data-value={value}>{value}</output></div>;
}
"#;
        let response = compile_state("resource-host-values.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let revision = plan.module_revision.clone();
        let components = plan.components.unwrap();
        let styled = components.iter().find(|component| component.name == "Styled").unwrap();
        let style_program = styled.closed_resource_host_program.as_ref().unwrap();
        assert_eq!(style_program["schemaVersion"], 3);
        assert_eq!(style_program["moduleRevision"], revision);
        assert_eq!(style_program["resourceUseSiteId"], styled.store_sites[0].site_id);
        assert_eq!(style_program["host"]["children"][0]["host"]["props"][0], serde_json::json!([
            "style", {"kind":"style","entries":[
                ["color",{"kind":"input","index":0}],
                ["background-color",{"kind":"literal","value":"red"}],
                ["--gap",{"kind":"binary","operator":"+",
                    "left":{"kind":"input","index":0},"right":{"kind":"literal","value":1.0}}],
                ["opacity",{"kind":"literal","value":0.5}]
            ]}
        ]));
        let positioned = components.iter().find(|component| component.name == "Positioned").unwrap();
        let tuple_program = positioned.closed_resource_host_program.as_ref().unwrap();
        assert_eq!(tuple_program["schemaVersion"], 3);
        assert_eq!(tuple_program["resourceUseSiteId"], positioned.store_sites[0].site_id);
        let props = tuple_program["host"]["children"][0]["host"]["props"].as_array().unwrap();
        assert_eq!(props.len(), 3);
        assert_eq!(props[0][0], "position");
        assert_eq!(props[0][1]["kind"], "tuple");
        assert_eq!(props[0][1]["items"].as_array().unwrap().len(), 3);
        assert_eq!(props[0][1]["items"][0], serde_json::json!({"kind":"input","index":0}));
        assert_eq!(props[1][0], "rotation");
        assert_eq!(props[2][0], "scale");
        let primitive = components.iter().find(|component| component.name == "Primitive").unwrap();
        assert_eq!(primitive.closed_resource_host_program.as_ref().unwrap()["schemaVersion"], 2);
        let code = plan.component_module.unwrap();
        assert_eq!(code.matches("closedResourceHostProgram:").count(), 3);
        assert!(code.contains("\"schemaVersion\":3"), "{code}");
    }

    #[test]
    fn declines_unsafe_resource_host_value_shapes_to_generic_reconciliation() {
        let cases = [
            ("tuple-length", "<mesh key=\"child\" position={[value, 1]}/>"),
            ("tuple-spread", "<mesh key=\"child\" position={[value, ...other]}/>"),
            ("tuple-hole", "<mesh key=\"child\" position={[value, , 1]}/>"),
            ("tuple-call", "<mesh key=\"child\" position={[value, read(), 1]}/>"),
            ("tuple-capture", "<mesh key=\"child\" position={[value, other, 1]}/>"),
            ("tuple-property", "<mesh key=\"child\" position={[value.x, 0, 1]}/>"),
            ("tuple-dom", "<div key=\"child\" position={[value, 0, 1]}/>"),
            ("style-spread", "<div key=\"child\" style={{ color: value, ...other }}/>"),
            ("style-computed", "<div key=\"child\" style={{ [other]: value }}/>"),
            ("style-getter", "<div key=\"child\" style={{ get color() { return value; } }}/>"),
            ("style-method", "<div key=\"child\" style={{ color() { return value; } }}/>"),
            ("style-shorthand", "<div key=\"child\" style={{ value }}/>"),
            ("style-call", "<div key=\"child\" style={{ color: choose(value) }}/>"),
            ("style-duplicate", "<div key=\"child\" style={{ color: value, color: 1 }}/>"),
            ("style-prototype", "<div key=\"child\" style={{ __proto__: value }}/>"),
            ("style-unsafe-name", "<div key=\"child\" style={{ \"--bad;name\": value }}/>"),
            ("style-three", "<mesh key=\"child\" style={{ color: value }}/>"),
            ("extra-read", "<div key=\"child\" style={{ color: props.other }}/>"),
        ];
        for (name, child) in cases {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\";\nexport function Candidate(props) {{ const value = use(props.resource); return <group key=\"root\">{child}</group>; }}");
            let response = compile_state(&format!("resource-host-{name}.tsx"), &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let component = response.plan.unwrap().components.unwrap().into_iter().next().unwrap();
            assert!(component.closed_resource_host_program.is_none(), "{name} unexpectedly closed");
        }
        for count in [32, 33] {
            let entries = (0..count).map(|index| format!("p{index}: value")).collect::<Vec<_>>().join(", ");
            let source = format!("import {{ use }} from \"native_runtime_api.ts\";\nexport function Candidate(props) {{ const value = use(props.resource); return <div key=\"root\" style={{{{{entries}}}}}/>; }}");
            let response = compile_state(&format!("resource-host-style-{count}.tsx"), &source);
            assert!(response.error.is_none(), "{count}: {:?}", response.error);
            let component = response.plan.unwrap().components.unwrap().into_iter().next().unwrap();
            assert_eq!(component.closed_resource_host_program.as_ref().map(|program|
                program["schemaVersion"].as_u64()),
                if count == 32 { Some(Some(3)) } else { None });
        }
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

        for (fixture, label, source) in [
            ("native-state-async-component.tsx", "async components",
                include_str!("../../fixtures/native-state-async-component.tsx")),
            ("mutable-arrow.tsx", "mutable arrow components",
                "import { useState } from 'native_runtime_api.ts'; let Mutable = () => { useState(1); return <main />; };"),
            ("async-arrow.tsx", "async arrow components",
                "import { useState } from 'native_runtime_api.ts'; const AsyncArrow = async () => { useState(1); return <main />; };"),
            ("multi-arrow.tsx", "multi-declarator arrow components",
                "import { useState } from 'native_runtime_api.ts'; const Multi = () => { useState(1); return <main />; }, other = 1;"),
        ] {
            let error = compile_state(fixture, source)
                .error
                .expect("unsupported hook component form must be rejected");
            assert!(error.starts_with(&format!("{fixture}:")), "{error}");
            assert!(error.contains(label), "{error}");
        }
    }

    #[test]
    fn compiles_module_const_arrows_at_their_initializer_with_shared_owner_sites() {
        let source = include_str!("../../fixtures/native-state-arrow-component.tsx");
        let response = compile_state("native-state-arrow-component.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let component = &plan.components.as_ref().unwrap()[0];
        assert_eq!(component.name, "ArrowApp");
        assert_eq!(component.state_sites.len(), 1);
        assert_eq!(component.state_sites[0].site_id,
            "native-state-arrow-component.tsx#component:ArrowApp#state:0");
        assert!(component.closed_resource_host_program.is_none());
        assert!(component.closed_store_host_program.is_none());
        let code = plan.component_module.unwrap();
        assert!(code.contains("export const ArrowApp = __nativeDefineComponent(\"native-state-arrow-component.tsx#component:ArrowApp\", ({ ArrowApp: () => {"), "{code}");
        assert!(code.contains("const [value] = __nativeUseStateAt(\"native-state-arrow-component.tsx#component:ArrowApp#state:0\", 1);"), "{code}");
        assert!(code.contains("}).ArrowApp, { propOnlySites:"), "{code}");
        assert!(!code.contains("\n__nativeDefineComponent(\"native-state-arrow-component.tsx#component:ArrowApp\", ArrowApp,"), "{code}");
    }

    #[test]
    fn expression_arrows_preserve_export_and_arrow_syntax() {
        let source = r#"import { use } from 'native_runtime_api.ts';
export const ArrowRow = ({ value }: { value: number }) => <output>{value}</output>;
const Plain = () => <output />;
"#;
        let response = compile_state("expression-arrow.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert_eq!(plan.components.as_ref().unwrap().len(), 2);
        let code = plan.component_module.unwrap();
        assert!(code.contains("export const ArrowRow = __nativeDefineComponent(\"expression-arrow.tsx#component:ArrowRow\", ({ ArrowRow: ({ value }: { value: number }) => <output>{value}</output> }).ArrowRow, { propOnlySites:"), "{code}");
        assert!(code.contains("const Plain = __nativeDefineComponent(\"expression-arrow.tsx#component:Plain\", ({ Plain: () => <output /> }).Plain, { propOnlySites:"), "{code}");
    }

    #[test]
    fn closed_const_arrows_share_function_proofs_and_keep_original_initializers() {
        let source = r#"import { use, useState } from "native_runtime_api.ts";
export function NamedCounter() { const [n] = useState(1); return <div data-n={n + 1}/>; }
export const ArrowCounter = () => { const [n] = useState(1); return <div data-n={n + 1}/>; };
export function NamedStore(props) { const value = use(props.store); return <div key="named-store" data-value={value}/>; }
export const ArrowStore = (props) => { const value = use(props.store); return <div key="arrow-store" data-value={value}/>; };
export function NamedResource(props) { const value = use(props.resource); return <div key="named-resource">{value}</div>; }
export const ArrowResource = (props) => { const value = use(props.resource); return <div key="arrow-resource">{value}</div>; };
export function NamedForward(props) { return <ArrowStore key="named-forward" store={props.store}/>; }
export const ArrowForward = (props) => <ArrowStore key="arrow-forward" store={props.store}/>;
"#;
        let response = compile_state("closed-arrows.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let components = plan.components.as_ref().unwrap();
        let get = |name: &str| components.iter().find(|component| component.name == name).unwrap();
        let named_counter = get("NamedCounter");
        let arrow_counter = get("ArrowCounter");
        assert_eq!(named_counter.numeric_sinks.len(), arrow_counter.numeric_sinks.len());
        assert!(!arrow_counter.numeric_sinks.is_empty());
        assert_eq!(named_counter.state_layout.as_ref().unwrap().slots.len(),
            arrow_counter.state_layout.as_ref().unwrap().slots.len());
        for (named, arrow, schema) in [
            ("NamedStore", "ArrowStore", 1),
            ("NamedResource", "ArrowResource", 1),
        ] {
            let named = get(named);
            let arrow = get(arrow);
            let (named_program, arrow_program) = if named.name.contains("Store") {
                (named.closed_store_host_program.as_ref().unwrap(),
                    arrow.closed_store_host_program.as_ref().unwrap())
            } else {
                (named.closed_resource_host_program.as_ref().unwrap(),
                    arrow.closed_resource_host_program.as_ref().unwrap())
            };
            assert_eq!(named_program["schemaVersion"], schema);
            assert_eq!(arrow_program["schemaVersion"], schema);
            assert_eq!(arrow_program["moduleRevision"], plan.module_revision);
            assert_eq!(arrow_program["componentProgramId"], arrow.component_site_id);
            assert_eq!(arrow.store_sites[0].site_id,
                format!("closed-arrows.tsx#component:{}#store:0", arrow.name));
        }
        for name in ["NamedForward", "ArrowForward"] {
            let component = get(name);
            let forward = component.closed_component_forward_program.as_ref().unwrap();
            assert_eq!(forward["childComponentProgramId"], get("ArrowStore").component_site_id);
            assert_eq!(forward["moduleRevision"], plan.module_revision);
        }
        let code = plan.component_module.unwrap();
        assert!(code.contains("export const ArrowForward = __nativeDefineComponent("), "{code}");
        assert!(code.contains("({ ArrowForward: (props) => <ArrowStore"), "{code}");
    }

    #[test]
    fn closed_arrow_jsx_elides_only_cooked_empty_children() {
        let source = "import { use } from \"native_runtime_api.ts\";\r\n\
export const Resource = (props) => { const value = use(props.resource); return <div key=\"resource\">\r\n\
  {/* empty */}\r\n  {value}\r\n</div>; };\r\n\
export const Store = (props) => { const value = use(props.store); return <div key=\"store\" data-value={value}>\r\n\
  {/* empty */}\r\n</div>; };\r\n\
export const Forward = (props) => (\r\n  <Store key=\"forward\" store={props.store}>\r\n\
    {/* empty */}\r\n  </Store>\r\n);";
        let response = compile_state("closed-arrow-whitespace.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let components = response.plan.unwrap().components.unwrap();
        let get = |name: &str| components.iter().find(|component| component.name == name).unwrap();
        assert!(get("Resource").closed_resource_host_program.is_some());
        assert!(get("Store").closed_store_host_program.is_some());
        assert!(get("Forward").closed_component_forward_program.is_some());
        for child in [" ", "\t", "&nbsp;", "hello", "\u{a0}", "\u{2028}"] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; export const Bad = (props) => {{ const value = use(props.resource); return <div key=\"bad\">{child}{{value}}</div>; }};");
            let response = compile_state("closed-arrow-text.tsx", &source);
            assert!(response.error.is_none(), "{child}: {:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0]
                .closed_resource_host_program.is_none(), "{child} unexpectedly elided");
        }
    }

    #[test]
    fn closed_arrows_decline_hidden_effects_captures_and_unsafe_forwarding() {
        for expression in [
            "other", "helper(value)", "this.value", "arguments[0]",
            "props.hidden", "({ get x() { return value; } }).x",
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; const other = 1; export const Bad = (props) => {{ const value = use(props.store); return <div key=\"bad\" data-value={{{expression}}}/>; }};");
            let response = compile_state("unsafe-arrow-store.tsx", &source);
            assert!(response.error.is_none(), "{expression}: {:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0]
                .closed_store_host_program.is_none(), "{expression} unexpectedly closed");
        }
        for output in [
            "<Leaf key=\"x\" store={choose(props.store)}/>",
            "<Leaf key=\"x\" store={this.store}/>",
            "<Leaf key=\"x\" store={arguments[0]}/>",
            "<Leaf key=\"x\" store={captured}/>",
            "<Leaf key=\"x\" store={props.store} onClick={() => 1}/>",
        ] {
            let source = format!("import {{ use }} from \"native_runtime_api.ts\"; const captured = 1; const Leaf = (props) => {{ const value = use(props.store); return <div key=\"leaf\" data-value={{value}}/>; }}; export const Bad = (props) => {output};");
            let response = compile_state("unsafe-arrow-forward.tsx", &source);
            assert!(response.error.is_none(), "{output}: {:?}", response.error);
            let components = response.plan.unwrap().components.unwrap();
            assert!(components.iter().find(|component| component.name == "Bad").unwrap()
                .closed_component_forward_program.is_none(), "{output} unexpectedly closed");
        }
        for body in [
            "const [n] = useState(0); trace.push(n); return <output data-n={n + 1}/>;",
            "const [n] = useState(0); return <output data-n={n + helper()}/>;",
        ] {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; const trace = []; export const Bad = () => {{ {body} }};");
            let response = compile_state("unsafe-arrow-numeric.tsx", &source);
            assert!(response.error.is_none(), "{body}: {:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0].numeric_sinks.is_empty(),
                "{body} unexpectedly certified");
        }
    }

    #[test]
    fn arrow_hooks_reject_parameter_defaults_nested_blocks_and_callbacks() {
        for (label, source) in [
            ("parameter", "import { useState } from 'native_runtime_api.ts'; const Default = (value = useState(1)) => <output>{value}</output>;"),
            ("block", "import { useState } from 'native_runtime_api.ts'; { const Nested = () => { useState(1); return <output />; }; }"),
            ("callback", "import { useState } from 'native_runtime_api.ts'; const Outer = () => { [1].map(() => useState(1)); return <output />; };"),
        ] {
            let error = compile_state("arrow-invalid.tsx", source).error
                .expect("invalid arrow hook placement must be rejected");
            assert!(error.contains("unsupported") || error.contains("native hooks"),
                "{label}: {error}");
        }
    }

    #[test]
    fn jsx_references_to_unsupported_arrows_fail_before_runtime_registration() {
        for (kind, declaration) in [
            ("mutable arrow", "let Bad = () => <output />;"),
            ("async arrow", "const Bad = async () => <output />;"),
            ("multi-declarator arrow", "const Bad = () => <output />, unused = 1;"),
        ] {
            let source = format!("import {{ use }} from 'native_runtime_api.ts'; {declaration} export const App = () => <Bad />;");
            let error = compile_state("bad-arrow-jsx.tsx", &source).error
                .expect("unsupported JSX component must be diagnosed");
            assert!(error.contains(kind) && error.contains("`Bad`"), "{error}");
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
        assert!(component.collection_sites.iter().all(|site| site.requires_owner_render),
            "row.id can be an arbitrary getter and must retain the owner render");
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
    fn collection_owner_proof_covers_whole_owner_and_row_callback() {
        let cases = [
            ("safe function", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul className=\"rows\">{rows.map(row => <Row row={row} />)}</ul>; }", true),
            ("safe arrow", "export const Board = ({ rows }: { rows: KeyedCollection<Row> }) => <ul>{rows.map(row => <Row row={row} />)}</ul>;", true),
            ("safe alias", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const direct = rows; return <ul>{direct.map(row => <Row row={row} />)}</ul>; }", true),
            ("safe static sibling", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul><li>heading</li>{rows.map(row => <Row row={row} />)}</ul>; }", true),
            ("safe unused state", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const [count] = useState(0); return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", true),
            ("destructuring default", "export function Board({ rows, ignored = readOpaque() }: { rows: KeyedCollection<Row>; ignored?: number }) { return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("destructuring rest", "export function Board({ rows, ...rest }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("state binding default", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const [ignored = readOpaque()] = useState(undefined); return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("effect registration", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { useEffect(() => {}); return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("opaque sibling", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row row={row} />)}<output>{readOpaque()}</output></ul>; }", false),
            ("opaque initializer", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const current = readOpaque(); return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("getter sibling", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul data-value={opaque.value}>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("row getter", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row key={row.id} row={row} />)}</ul>; }", false),
            ("row member prop", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row id={row.id} />)}</ul>; }", false),
            ("callback helper", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row row={helper(row)} />)}</ul>; }", false),
            ("captured prop", "export function Board({ rows, label }: { rows: KeyedCollection<Row>; label: string }) { return <ul>{rows.map(row => <Row row={row} label={label} />)}</ul>; }", false),
            ("captured state", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const [count] = useState(0); return <ul>{rows.map(row => <Row row={row} count={count} />)}</ul>; }", false),
            ("state sibling", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const [count] = useState(0); return <ul data-count={count}>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("conditional control", "export function Board({ rows, show }: { rows: KeyedCollection<Row>; show: boolean }) { return show ? <ul>{rows.map(row => <Row row={row} />)}</ul> : null; }", false),
            ("event closure", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul onClick={() => activate()}>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("row event", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row row={row} onClick={() => activate(row)} />)}</ul>; }", false),
            ("native activation", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul ref={activate}>{rows.map(row => <Row row={row} />)}</ul>; }", false),
            ("mutable tag", "let Current = Row; export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Current row={row} />)}</ul>; }", false),
            ("imported tag", "import { Foreign } from './foreign.ts'; export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Foreign row={row} />)}</ul>; }", false),
            ("parameter tag", "export function Board({ rows, Current }: { rows: KeyedCollection<Row>; Current: typeof Row }) { return <ul>{rows.map(row => <Current row={row} />)}</ul>; }", false),
            ("shadowed tag", "export function Board({ rows }: { rows: KeyedCollection<Row> }) { const Current = Row; return <ul>{rows.map(row => <Current row={row} />)}</ul>; }", false),
            ("direct eval", "function unrelated() { eval('Row = null'); } export function Board({ rows }: { rows: KeyedCollection<Row> }) { return <ul>{rows.map(row => <Row row={row} />)}</ul>; }", false),
        ];
        for (name, body, closed) in cases {
            let source = format!("import {{ useState, useEffect }} from 'native_runtime_api.ts'; import type {{ KeyedCollection }} from '@compiled-ui/runtime/core'; type Row = {{ id: number }}; function Row({{ row }}: {{ row: Row }}) {{ return <li>{{row.id}}</li>; }} {body}");
            let response = compile_state("collection-owner-proof.tsx", &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let plan = response.plan.unwrap();
            let board = plan.components.as_ref().unwrap().iter().find(|component| component.name == "Board").unwrap();
            assert_eq!(board.collection_sites.len(), 1, "{name}");
            assert_eq!(!board.collection_sites[0].requires_owner_render, closed, "{name}");
            assert_eq!(board.closed_collection_sites.len() == 1, closed, "{name}");
            let code = plan.component_module.unwrap();
            assert!(code.contains("closedCollectionSites: ["), "{name}");
            assert_eq!(code.contains("closedCollectionSites: []"), !closed, "{name}");
            assert_eq!(code.contains("requiresOwnerRender: true"), !closed, "{name}");
        }
    }

    #[test]
    fn keeps_conditional_effect_demo_owner_generic() {
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
        assert!(moving.prop_only_sites.is_empty(),
            "conditional effect and opaque event branch require the owner render");
        assert!(moving.state_layout.is_none());
        let code = plan.component_module.unwrap();
        assert!(code.contains("__nativeBindStatePropAt(\"src/browser/native_state_props.tsx#component:MovingDot#state:"),
            "pure MovingDot sinks retain bindings while its owner stays generic");
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

    #[test]
    fn closed_derived_locals_expand_into_numeric_programs() {
        let response = compile_state(
            "derived-owner-locals.tsx",
            r#"import { useState } from "native_runtime_api.ts";
export function Row() {
  const [x] = useState(2);
  const [y] = useState(3);
  const offset = 2;
  const moved = x + offset;
  const sum = x + y;
  const twice = sum + sum;
  const label = `🙂 sum=${sum}; nested=${`${x}-${y}`}; escaped=\\n`;
  return <div data-sum={sum} data-twice={twice} data-label={label} data-moved={moved} />;
}"#,
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let row = &plan.components.as_ref().unwrap()[0];
        let layout = row
            .state_layout
            .as_ref()
            .expect("closed local chains qualify");
        assert_eq!(layout.slots.len(), 2);
        assert_eq!(row.prop_only_sites.len(), 2);
        let code = plan.component_module.unwrap();
        assert!(code.contains("(x + y)"), "{code}");
        assert!(code.contains("(x + (2))"), "{code}");
        assert!(code.contains("((x + y) + (x + y))"), "{code}");
        assert!(code.contains("🙂 sum=${(x + y)}"), "{code}");
        assert!(code.contains("nested=${`${x}-${y}`}"), "{code}");
        assert!(code.contains("escaped=\\\\n"), "{code}");
        assert!(code.contains("schemaVersion: 2, ownerProgramId:"), "{code}");
    }

    #[test]
    fn numeric_owner_proof_requires_the_entire_named_or_arrow_render_to_be_closed() {
        let good = [
            "export function Counter() { const [n, setN] = useState(0); useEffect(() => { trace.set = setN; return cleanup; }); const plus = n + 1; return <output data-n={plus} />; }",
            "export const Counter = () => { const [n] = useState(0); const plus = n + 1; return <output data-n={plus} />; };",
        ];
        for body in good {
            let source = format!("import {{ useEffect, useState }} from \"native_runtime_api.ts\"; {body}");
            let response = compile_state("numeric-owner-closed.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            assert_eq!(plan.components.as_ref().unwrap()[0].prop_only_sites.len(), 1);
            assert!(plan.component_module.unwrap().contains("__nativeNumericPrograms"));
        }
        let unsafe_bodies = [
            "trace.renders++;",
            "const opaque = readOpaque();",
            "const opaque = object.value;",
            "const opaque = n + readOpaque();",
            "const opaque = [1];",
            "useEffect(makeEffect());",
        ];
        for statement in unsafe_bodies {
            let source = format!("import {{ useEffect, useState }} from \"native_runtime_api.ts\"; export function Counter() {{ const [n] = useState(0); {statement} return <output data-n={{n + 1}} />; }}");
            let response = compile_state("numeric-owner-opaque.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            assert!(plan.components.as_ref().unwrap()[0].prop_only_sites.is_empty(), "{source}");
        }
        let source = "import { useState } from \"native_runtime_api.ts\"; export function Counter() { const [n] = useState(0); const opaque = readOpaque(); return <output data-n={n + 1} data-opaque={opaque} />; }";
        let response = compile_state("numeric-owner-sibling.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        assert!(plan.components.as_ref().unwrap()[0].prop_only_sites.is_empty());
        assert!(plan.component_module.unwrap().contains("__nativeNumericPrograms"));
        for sibling in ["object.value", "readOpaque()", "this.value", "arguments[0]"] {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; export function Counter() {{ const [n] = useState(0); return <output data-n={{n + 1}} data-opaque={{{sibling}}} />; }}");
            let response = compile_state("numeric-owner-sibling-read.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            assert!(plan.components.as_ref().unwrap()[0].prop_only_sites.is_empty(), "{source}");
        }
    }

    #[test]
    fn numeric_owner_event_proof_accepts_only_owner_setter_callbacks() {
        for body in [
            "export function Counter() { const [n, setN] = useState(0); return <button data-n={n + 1} onClick={() => setN(previous => previous + 1)} />; }",
            "export const Counter = () => { const [n, setN] = useState(0); return <button data-n={n + 1} onClick={() => setN(1)} />; };",
        ] {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; {body}");
            let response = compile_state("numeric-owner-event.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            assert_eq!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.len(), 1);
        }
        for callback in ["() => report(n)", "() => object.call()", "() => setN(n + 1)", "() => setN(previous => globalValue + previous)"] {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; export function Counter() {{ const [n, setN] = useState(0); return <button data-n={{n + 1}} onClick={{{callback}}} />; }}");
            let response = compile_state("numeric-owner-event-opaque.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.is_empty(), "{source}");
        }
    }

    #[test]
    fn numeric_owner_ref_proof_requires_a_stable_module_local_binding() {
        for binding in [
            "export function captureNode(node) { return () => {}; }",
            "export const captureNode = node => () => {};",
        ] {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; {binding} export function Counter() {{ const [n] = useState(0); return <output ref={{captureNode}} data-n={{n + 1}} />; }}");
            let response = compile_state("numeric-owner-stable-ref.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            assert_eq!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.len(), 1, "{source}");
        }
        for (binding, reference) in [
            ("let captureNode = node => () => {}; captureNode = node => () => {};", "captureNode"),
            ("const refHolder = { captureNode(node) {} };", "refHolder.captureNode"),
            ("", "node => captureNode(node)"),
            ("import { captureNode } from './ref.ts';", "captureNode"),
        ] {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; {binding} export function Counter() {{ const [n] = useState(0); return <output ref={{{reference}}} data-n={{n + 1}} />; }}");
            let response = compile_state("numeric-owner-unstable-ref.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.is_empty(), "{source}");
        }
        let source = "import { useState } from 'native_runtime_api.ts'; function captureNode(node) {} function unrelated() { eval('captureNode = null'); } export function Counter() { const [n] = useState(0); return <output ref={captureNode} data-n={n + 1} />; }";
        let response = compile_state("numeric-owner-eval-ref.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        assert!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.is_empty());
    }

    #[test]
    fn numeric_owner_dom_position_arrays_reuse_only_certified_sink_spans() {
        for tag in ["i", "li"] {
            let source = format!("import {{ useState }} from 'native_runtime_api.ts'; export function Row() {{ const [x] = useState(1); const [y] = useState(2); const [z] = useState(3); return <{tag} position={{[z, x, y]}} style={{{{ left: `${{x}}px` }}}} />; }}");
            let response = compile_state("numeric-owner-dom-vector.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            assert_eq!(plan.components.as_ref().unwrap()[0].prop_only_sites.len(), 3, "{source}");
            let code = plan.component_module.unwrap();
            assert!(code.contains("position={__nativeBindStatePropsAt("), "{code}");
            assert!(code.contains("=> ([z, x, y])"), "{code}");
        }
        for position in ["[1, 2, 3]", "[z, opaque(), y]"] {
            let source = format!("import {{ useState }} from 'native_runtime_api.ts'; export function Row() {{ const [x] = useState(1); const [y] = useState(2); const [z] = useState(3); return <i position={{{position}}} data-n={{x + 1}} />; }}");
            let response = compile_state("numeric-owner-dom-vector-opaque.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            assert!(plan.components.as_ref().unwrap()[0].prop_only_sites.is_empty(), "{source}");
        }
    }

    #[test]
    fn numeric_owner_key_proof_accepts_immutable_props_but_not_state() {
        let source = "import { useState } from 'native_runtime_api.ts'; export function Item({ id }) { const [n] = useState(0); return <li key={id} data-n={n + 1} />; }";
        let response = compile_state("numeric-owner-prop-key.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let item = &plan.components.as_ref().unwrap()[0];
        assert_eq!(item.prop_only_sites.len(), 1);
        assert_eq!(item.numeric_primitive_props, vec!["id"]);
        let source = "import { useState } from 'native_runtime_api.ts'; export function Item() { const [n] = useState(0); return <li key={n} data-n={n + 1} />; }";
        let response = compile_state("numeric-owner-state-key.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        assert!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.is_empty());
    }

    #[test]
    fn numeric_owner_direct_primitive_props_are_guarded_and_nested_reads_decline() {
        let cases = [
            ("export function Counter(props) { const [n] = useState(0); return <output data-id={props.id} data-n={n + 1} />; }", true),
            ("export const Counter = ({ id }) => { const [n] = useState(0); return <output data-id={id} data-n={n + 1} />; };", true),
            ("export function Counter({ row }) { const [n] = useState(0); return <output data-id={row.id} data-n={n + 1} />; }", false),
            ("export function Counter(props) { const [n] = useState(0); return <output data-id={props.row.id} data-n={n + 1} />; }", false),
        ];
        for (body, eligible) in cases {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; {body}");
            let response = compile_state("numeric-owner-props.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            let component = &plan.components.as_ref().unwrap()[0];
            assert_eq!(component.prop_only_sites.len() == 1, eligible, "{source}");
            assert_eq!(component.numeric_primitive_props.first().map(String::as_str) == Some("id") &&
                component.numeric_primitive_props.len() == 1, eligible, "{source}");
            let code = plan.component_module.unwrap();
            assert_eq!(code.contains("numericPrimitiveProps: [\"id\"]"), eligible, "{code}");
        }
    }

    #[test]
    fn numeric_owner_captures_unused_destructuring_and_declines_reserved_props() {
        let source = "import { useState } from 'native_runtime_api.ts'; export function Counter({ unused }) { const [n] = useState(0); const [label] = useState('ready'); return <output data-n={n + 1}>{label}</output>; }";
        let response = compile_state("numeric-owner-all-inputs.tsx", source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let component = &plan.components.as_ref().unwrap()[0];
        assert_eq!(component.numeric_primitive_props, vec!["unused"]);
        let code = plan.component_module.unwrap();
        assert!(code.contains("numericPrimitiveProps: [\"unused\"]"), "{code}");
        for parameter in ["{ key }", "{ ref }"] {
            let source = format!("import {{ useState }} from 'native_runtime_api.ts'; export function Counter({parameter}) {{ const [n] = useState(0); return <output data-n={{n + 1}} />; }}");
            let response = compile_state("numeric-owner-reserved-prop.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.is_empty());
        }
        for property in ["key", "ref"] {
            let source = format!("import {{ useState }} from 'native_runtime_api.ts'; export function Counter(props) {{ const [n] = useState(0); return <output data-n={{n + 1}} data-reserved={{props.{property}}} />; }}");
            let response = compile_state("numeric-owner-reserved-read.tsx", &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            assert!(response.plan.unwrap().components.unwrap()[0].prop_only_sites.is_empty());
        }
    }

    #[test]
    fn numeric_owner_keeps_independent_primitive_text_generic_and_static_three_args_closed() {
        let cases = [
            ("mixed-text.tsx", "export function Row() { const [x] = useState(0); const [label] = useState(\"ready\"); return <div data-x={x}><span>{label}</span></div>; }"),
            ("static-three-args.tsx", "export function Scene() { const [x] = useState(0); return <mesh position={[x, 0, 0]}><boxGeometry args={[1, 2, 3]} /><meshStandardMaterial roughness={x / 10} /></mesh>; }"),
        ];
        for (path, body) in cases {
            let source = format!("import {{ useState }} from \"native_runtime_api.ts\"; {body}");
            let response = compile_state(path, &source);
            assert!(response.error.is_none(), "{:?}", response.error);
            let plan = response.plan.unwrap();
            assert_eq!(plan.components.as_ref().unwrap()[0].prop_only_sites.len(), 1, "{source}");
            assert!(plan.component_module.unwrap().contains("__nativeNumericPrograms"), "{source}");
        }
    }

    #[test]
    fn derived_scalar_aliases_qualify_generic_numeric_tuple_sinks_only() {
        let response = compile_state(
            "derived-array-generic.tsx",
            r#"import { useState } from "native_runtime_api.ts";
export function Row() {
  const [x] = useState(1);
  const parity = x % 2;
  return <mesh data-value={x} position={[x, parity, 0]} />;
}"#,
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let row = &plan.components.as_ref().unwrap()[0];
        assert_eq!(row.state_layout.as_ref().unwrap().slots.len(), 1);
        assert_eq!(row.prop_only_sites.len(), 1);
        let code = plan.component_module.unwrap();
        assert_eq!(code.matches("schemaVersion: 2, ownerProgramId:").count(), 2, "{code}");
        assert!(code.contains("(x % 2)"), "{code}");
        assert!(code.contains("position={__nativeBindStatePropAt("), "{code}");
        assert!(code.contains("(x) => ([x, (x % 2), 0])"), "{code}");
        assert!(!code.contains("__nativeOwnerCutKernels"), "{code}");
    }

    #[test]
    fn unsupported_derived_array_aliases_keep_the_owner_fallback() {
        let cases = [
            (
                "array initializer",
                "const position = [x, 0, 0]; return <mesh position={position} />;",
            ),
            (
                "object initializer",
                "const payload = { x }; return <mesh userData={payload} />;",
            ),
            (
                "call initializer",
                "const parity = Math.abs(x); return <mesh position={[x, parity, 0]} />;",
            ),
            (
                "member initializer",
                "const parity = x.value; return <mesh position={[x, parity, 0]} />;",
            ),
            (
                "captured alias",
                "const parity = x % 2; const capture = () => parity; return <mesh position={[x, parity, 0]} />;",
            ),
        ];
        for (name, body) in cases {
            let mut source = String::from(
                r#"import { useState } from "native_runtime_api.ts"; export function Row() { const [x] = useState(1); "#,
            );
            source.push_str(body);
            source.push_str(" }");
            let response = compile_state("derived-array-negative.tsx", &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let row = &response.plan.unwrap().components.unwrap()[0];
            assert!(
                row.state_layout.is_none(),
                "{name} unexpectedly qualified: layout={:?}, prop_only={:?}",
                row.state_layout,
                row.prop_only_sites
            );
        }
    }

    #[test]
    fn unsupported_derived_local_uses_poison_the_owner_program() {
        let cases = [
            (
                "let initializer",
                "let value = x + 1; return <div data-value={value} />;",
            ),
            (
                "call initializer",
                "const value = Math.abs(x); return <div data-value={value} />;",
            ),
            (
                "member initializer",
                "const value = x.toString; return <div data-value={value} />;",
            ),
            (
                "outside capture",
                "const value = x + 1; const capture = () => value; return <div data-value={value} />;",
            ),
            (
                "block scope",
                "if (true) { const value = x + 1; } return <div data-value={value} />;",
            ),
            (
                "forward reference",
                "const value = later + 1; const later = x + 1; return <div data-value={value} />;",
            ),
            (
                "mutated local",
                "const value = x + 1; value++; return <div data-value={value} />;",
            ),
            (
                "shadowed reference",
                "const value = x + 1; return <div data-value={((x) => x)(value)} />;",
            ),
        ];
        for (name, body) in cases {
            let mut source = String::from(
                r#"import { useState } from "native_runtime_api.ts"; export function Row() { const [x] = useState(2); "#,
            );
            source.push_str(body);
            source.push_str(" }");
            let response = compile_state("derived-owner-negative.tsx", &source);
            assert!(response.error.is_none(), "{name}: {:?}", response.error);
            let row = &response.plan.unwrap().components.unwrap()[0];
            assert!(
                row.state_layout.is_none(),
                "{name} unexpectedly qualified: layout={:?}, prop_only={:?}",
                row.state_layout,
                row.prop_only_sites
            );
        }
    }

    #[test]
    fn derived_local_expansion_has_deterministic_depth_and_size_budgets() {
        let mut source = String::from(
            r#"import { useState } from "native_runtime_api.ts"; export function Row() { const [x] = useState(2); const d0 = x + x; "#,
        );
        for index in 1..24 {
            source.push_str(&format!(
                "const d{index} = d{} + d{};",
                index - 1,
                index - 1
            ));
        }
        source.push_str("return <div data-value={d23} />; }");
        let response = compile_state("derived-owner-budget.tsx", &source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let row = &response.plan.unwrap().components.unwrap()[0];
        assert!(
            row.state_layout.is_none(),
            "exponential expansion must fall back"
        );
    }

    #[test]
    fn static_derived_outputs_do_not_consume_state_program_budget() {
        let literal = format!("\"{}\"", "s".repeat(96));
        let mut source = String::from(
            r#"import { useState } from "native_runtime_api.ts"; export function Row() { const [x] = useState(2); const label = "#,
        );
        source.push_str(&literal);
        source.push_str("; return <div data-value={x} ");
        for index in 0..240 {
            source.push_str(&format!("data-static-{index}={{label}} "));
        }
        source.push_str("/>; }");
        let response = compile_state("derived-owner-static-budget.tsx", &source);
        assert!(response.error.is_none(), "{:?}", response.error);
        let row = &response.plan.unwrap().components.unwrap()[0];
        assert!(
            row.state_layout.is_some(),
            "untracked static prop expansion must not exhaust the state-derived owner budget"
        );
        assert_eq!(row.prop_only_sites.len(), 1);
    }

    #[test]
    fn emits_one_primitive_whole_cut_kernel_and_preserves_v2_fallbacks() {
        let response = compile_state(
            "native-owner-cut-kernel.tsx",
            include_str!("../../fixtures/native-owner-cut-kernel.tsx"),
        );
        assert!(response.error.is_none(), "{:?}", response.error);
        let plan = response.plan.unwrap();
        let components = plan.components.as_ref().unwrap();
        let row = components
            .iter()
            .find(|component| component.name == "Row")
            .unwrap();
        let same_shape = components
            .iter()
            .find(|component| component.name == "SameShape")
            .unwrap();
        let vector = components
            .iter()
            .find(|component| component.name == "Vector")
            .unwrap();
        assert_ne!(row.component_site_id, same_shape.component_site_id);
        let code = plan.component_module.unwrap();
        assert!(
            code.contains("const __nativeOwnerCutKernels: readonly import(\"native_runtime_api.ts\").CompiledOwnerUpdateProgram[] = ["),
            "{code}"
        );
        assert_eq!(code.matches("slotCount: 2").count(), 2, "{code}");
        assert!(
            code.contains("ownerUpdateProgram: __nativeOwnerCutKernels[0]"),
            "{code}"
        );
        assert!(
            code.contains("ownerUpdateProgram: __nativeOwnerCutKernels[1]"),
            "{code}"
        );
        assert!(!vector.prop_only_sites.is_empty());
        assert!(
            !code.contains("ownerUpdateProgram: __nativeOwnerCutKernels[2]"),
            "{code}"
        );
        assert_eq!(
            code.matches("schemaVersion: 2, programId:").count(),
            2,
            "{code}"
        );
        assert!(code.contains("executeCut: function(changedSlots, changeCount, rowStates, stagedInputIndices, stagedSinkIds, stagedValues)"), "{code}");
        assert!(code.contains("rowStates[changeIndex]!"), "{code}");
        assert!(
            code.contains("stagedInputIndices[stagedCount] = changeIndex"),
            "{code}"
        );
        assert!(!code.contains("stagedRows[stagedCount]"), "{code}");
        // V2 descriptors and sink projectors remain the fallback representation.
        assert!(code.contains("schemaVersion: 2, ownerProgramId:"), "{code}");
        assert!(
            code.contains("data-sum={__nativeBindStatePropsAt("),
            "{code}"
        );
        assert!(
            code.contains("position={__nativeBindStatePropsAt("),
            "{code}"
        );
        assert!(code.contains("Math.sin(x)"), "{code}");
        // The primitive kernel has a static switch and inline SameValue semantics;
        // it does not call Object.is or invoke host writers.
        assert!(
            code.contains("switch (changedSlots[changeIndex])"),
            "{code}"
        );
        assert!(
            code.contains("last === next ? (typeof next !== 'number'"),
            "{code}"
        );
        assert!(
            code.contains("typeof last === 'number' && typeof next === 'number' && last !== last && next !== next"),
            "{code}"
        );
        assert!(!code.contains("Object.is(last, next)"), "{code}");
        assert!(
            code.contains("rowState.inputValues[0] > 0 ? \"positive\" : \"nonpositive\""),
            "{code}"
        );
        assert!(code.contains("data-escaped"), "{code}");
        assert_eq!(
            code.matches("ownerUpdateProgram: __nativeOwnerCutKernels[")
                .count(),
            2,
            "{code}"
        );
        for name in [
            "Member",
            "Call",
            "ShadowedUndefined",
            "Mutation",
            "Opaque",
            "MixedCoverage",
        ] {
            let component = components
                .iter()
                .find(|component| component.name == name)
                .unwrap();
            let marker = format!(
                "__nativeDefineComponent(\"{}\"",
                component.component_site_id
            );
            let start = code.find(&marker).unwrap();
            let end = code[start..]
                .find(");")
                .map(|offset| start + offset + 2)
                .unwrap();
            assert!(!code[start..end].contains("ownerUpdateProgram"), "{code}");
        }

        let vector_only = compile_state(
            "primitive-kernel-vector-fallback.tsx",
            r#"import { useState } from "native_runtime_api.ts"; export function Vector() { const [x] = useState(1); const [y] = useState(2); return <mesh position={[x, y]} />; }"#,
        );
        assert!(vector_only.error.is_none(), "{:?}", vector_only.error);
        let vector_code = vector_only.plan.unwrap().component_module.unwrap();
        assert!(
            !vector_code.contains("__nativeOwnerCutKernels"),
            "{vector_code}"
        );
        assert!(vector_code.contains("position={__nativeBindStatePropsAt([\"primitive-kernel-vector-fallback.tsx#component:Vector#state:0\", \"primitive-kernel-vector-fallback.tsx#component:Vector#state:1\"], ([x, y]) => ([x, y]), __nativeNumericPrograms[0])}"), "{vector_code}");
    }
}
