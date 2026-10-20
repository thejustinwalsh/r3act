use serde::Serialize;
use std::collections::BTreeMap;

use super::{NativeComponentMetadata, NativeTaskPlan};

#[derive(Debug, Serialize)]
pub(super) struct SemanticPlan {
    schema_version: u32,
    source_file: String,
    module_revision: String,
    owners: Vec<SemanticOwner>,
    sources: Vec<SemanticSource>,
    sinks: Vec<SemanticSink>,
    operations: Vec<SemanticOperation>,
    graph: SemanticGraph,
}

#[derive(Debug, Serialize)]
struct SemanticOwner {
    site_id: String,
    repeated_scope: &'static str,
}

#[derive(Debug, Serialize)]
struct SemanticSource {
    site_id: String,
    owner_site_id: String,
    kind: &'static str,
    provenance: &'static str,
}

#[derive(Debug, Serialize)]
struct SemanticSink {
    site_id: String,
    owner_site_id: String,
    source_sites: Vec<String>,
    provenance: &'static str,
    equality: &'static str,
    host_value: &'static str,
    retention: &'static str,
    execution: &'static str,
}

#[derive(Debug, Serialize)]
struct SemanticGraph {
    coverage: &'static str,
    source_to_sinks: BTreeMap<String, Vec<String>>,
    execution_order: Vec<String>,
}

#[derive(Debug, Serialize)]
struct SemanticOperation {
    site_id: String,
    owner_site_id: Option<String>,
    kind: &'static str,
    provenance: &'static str,
    source_sites: Vec<String>,
}

impl SemanticPlan {
    pub(super) fn empty() -> Self {
        Self {
            schema_version: 1,
            source_file: String::new(),
            module_revision: String::new(),
            owners: Vec::new(),
            sources: Vec::new(),
            sinks: Vec::new(),
            operations: Vec::new(),
            graph: SemanticGraph {
                coverage: "proven-sinks-only",
                source_to_sinks: BTreeMap::new(),
                execution_order: Vec::new(),
            },
        }
    }
}

pub(super) fn module_revision(path: &str, source: &str) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in path.bytes().chain([0]).chain(source.bytes()) {
        hash = (hash ^ u64::from(byte)).wrapping_mul(0x100000001b3);
    }
    format!("native-v1-{hash:016x}")
}

pub(super) fn build_semantic_plan(
    path: &str,
    revision: &str,
    components: Option<&[NativeComponentMetadata]>,
    tasks: &[NativeTaskPlan],
    task_order: &[usize],
) -> SemanticPlan {
    let mut plan = SemanticPlan::empty();
    plan.source_file = path.to_owned();
    plan.module_revision = revision.to_owned();
    for component in components.unwrap_or(&[]) {
        let owner = &component.component_site_id;
        plan.owners.push(SemanticOwner {
            site_id: owner.clone(),
            repeated_scope: "runtime-keyed-owner",
        });
        for state in &component.state_sites {
            plan.sources.push(SemanticSource {
                site_id: state.site_id.clone(),
                owner_site_id: owner.clone(),
                kind: "state",
                provenance: "tracked",
            });
        }
        for store in &component.store_sites {
            plan.sources.push(SemanticSource {
                site_id: store.site_id.clone(),
                owner_site_id: owner.clone(),
                kind: "use-input",
                provenance: "opaque",
            });
            plan.operations.push(SemanticOperation {
                site_id: store.site_id.clone(),
                owner_site_id: Some(owner.clone()),
                kind: "use-store-or-resource",
                provenance: "opaque",
                source_sites: Vec::new(),
            });
        }
        for sink in &component.numeric_sinks {
            for source in &sink.source_sites {
                plan.graph.source_to_sinks.entry(source.clone()).or_default().push(sink.sink_id.clone());
            }
            plan.graph.execution_order.push(sink.sink_id.clone());
            plan.sinks.push(SemanticSink {
                site_id: sink.sink_id.clone(),
                owner_site_id: owner.clone(),
                source_sites: sink.source_sites.clone(),
                provenance: "closed",
                equality: "object-is",
                host_value: if sink.primitive_value { "scalar" } else { "adapter-declared" },
                retention: if sink.primitive_value { "value" } else { "adapter-declared" },
                execution: "compiled-binding",
            });
        }
        for sink in &component.opaque_sinks {
            plan.sinks.push(SemanticSink {
                site_id: sink.clone(),
                owner_site_id: owner.clone(),
                source_sites: Vec::new(),
                provenance: "opaque",
                equality: "adapter-declared",
                host_value: "adapter-declared",
                retention: "adapter-declared",
                execution: "generic",
            });
        }
        for collection in &component.collection_sites {
            plan.operations.push(SemanticOperation {
                site_id: collection.site_id.clone(),
                owner_site_id: Some(owner.clone()),
                kind: "collection",
                provenance: "opaque",
                source_sites: Vec::new(),
            });
        }
        for effect in &component.effect_sites {
            plan.operations.push(SemanticOperation {
                site_id: effect.site_id.clone(),
                owner_site_id: Some(owner.clone()),
                kind: "activation-effect",
                provenance: "opaque",
                source_sites: Vec::new(),
            });
        }
    }
    for task in tasks {
        plan.operations.push(SemanticOperation {
            site_id: task.site_id.clone(),
            owner_site_id: None,
            kind: "async-task",
            provenance: "opaque",
            source_sites: task.depends_on.clone(),
        });
    }
    for &index in task_order {
        if let Some(task) = tasks.get(index) {
            plan.graph.execution_order.push(task.site_id.clone());
        }
    }
    plan
}
