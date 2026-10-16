# Targeted native control: exact command manifest

The preregistered order and receipt paths are in [protocol.json](protocol.json). Run **one page at a time** from the project root. Do not turn this list into an automated matrix loop. Follow the listed mode order exactly; never regroup pages by server/build. Start or restart a preview only after loading `$portless-dev-servers` and using Portless. To avoid the previously observed concurrent-alias 404, keep only the preview for the current mode active: stop the prior **owned** preview, start the needed one if absent, verify its route and served assets, run the one collector, then switch as the next listed mode requires. Leave unrelated/shared routes untouched. The original route must be exactly `https://react-runtime-headless.localhost:1355`; stop for review if Portless cannot provide it. The diagnostic route must be an HTTPS `.localhost` URL and remain identical across all diagnostic pages. Do not use a numbered HTTP server.

```sh
export PATH=/Users/tjw/.nvm/versions/node/v24.18.0/bin:$PATH
# Start this foreground command only for an original page:
portless run --name react-runtime-headless ./node_modules/.bin/vite preview --config .cache/current-owner-kernel-headless-20261013-v1/preview.config.ts
# Start this foreground command only for an off/on page:
portless run --name dense-ledger ./node_modules/.bin/vite preview --config .cache/dense-causal-ledger-v1/tooling/preview.config.ts
```

After each collector prints `PASS <raw-record-path>`, copy that exact raw `record.json` into the named receipt path with `cp -n`; keep the original raw run directory. If it prints FAIL/INCOMPLETE, copy the failed raw receipt anyway and stop the recording for review. Never fill a missing slot with an old record. Create the target receipt directory once before its size. Each invocation is fresh-browser, 60 warmup plus 240 measured frames, with the collector's 90-second deadline.

## 1024 rows

```sh
mkdir -p .cache/dense-causal-control-v1/receipts/1024
```

### Block 1: original → off → on

**01 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 1024
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/01-original.json
```

**02 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/02-off.json
```

**03 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/03-on.json
```

### Block 2: on → off → original

**04 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/04-on.json
```

**05 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/05-off.json
```

**06 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 1024
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/06-original.json
```

### Block 3: original → on → off

**07 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 1024
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/07-original.json
```

**08 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/08-on.json
```

**09 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/09-off.json
```

### Block 4: off → on → original

**10 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/10-off.json
```

**11 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/11-on.json
```

**12 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 1024
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/12-original.json
```

### Block 5: off → original → on

**13 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/13-off.json
```

**14 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 1024
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/14-original.json
```

**15 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/15-on.json
```

### Block 6: on → original → off

**16 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/16-on.json
```

**17 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 1024
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/17-original.json
```

**18 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 1024 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/1024/18-off.json
```

Analyze only after all 18 receipts exist (including any failures):

```sh
node .cache/dense-causal-control-v1/analyze.mjs --rows 1024 --out .cache/dense-causal-control-v1/analysis-1024.json
```

## 10000 rows — conditional on primary review of 1,024

```sh
mkdir -p .cache/dense-causal-control-v1/receipts/10000
```

### Block 1: original → off → on

**01 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 10000
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/01-original.json
```

**02 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/02-off.json
```

**03 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/03-on.json
```

### Block 2: on → off → original

**04 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/04-on.json
```

**05 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/05-off.json
```

**06 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 10000
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/06-original.json
```

### Block 3: original → on → off

**07 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 10000
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/07-original.json
```

**08 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/08-on.json
```

**09 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/09-off.json
```

### Block 4: off → on → original

**10 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/10-off.json
```

**11 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/11-on.json
```

**12 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 10000
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/12-original.json
```

### Block 5: off → original → on

**13 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/13-off.json
```

**14 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 10000
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/14-original.json
```

**15 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/15-on.json
```

### Block 6: on → original → off

**16 on**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode on --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/16-on.json
```

**17 original**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode original --arm native --rows 10000
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/17-original.json
```

**18 off**

```sh
node .cache/dense-causal-ledger-v1/tooling/collect-one.mjs --mode off --arm native --rows 10000 --origin https://dense-ledger.localhost:1355
cp -n RAW_RECORD_PATH .cache/dense-causal-control-v1/receipts/10000/18-off.json
```

Analyze only after all 18 receipts exist (including any failures):

```sh
node .cache/dense-causal-control-v1/analyze.mjs --rows 10000 --out .cache/dense-causal-control-v1/analysis-10000.json
```
