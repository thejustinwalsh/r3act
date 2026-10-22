export function installClosedRows(mount: (container: HTMLElement) => { step(index: number): void; inspect(): unknown; dispose(): unknown }) {
  let app: ReturnType<typeof mount> | null = null;
  Object.assign(window, { closedRows: {
    mount() { if (app) throw new Error('Already mounted'); app = mount(document.querySelector('#mount') as HTMLElement); return app.inspect(); },
    step(index: number) { if (!app) throw new Error('Not mounted'); app.step(index); },
    inspect() { if (!app) throw new Error('Not mounted'); return app.inspect(); },
    dispose() { if (!app) throw new Error('Not mounted'); const result = app.dispose(); app = null; return result; },
  } });
}
