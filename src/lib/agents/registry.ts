import type { BaseAgent } from "./base";

// Agents with custom run() logic
import { LedgerAgent } from "./ledger";
import { JarvisAgent } from "./jarvis";
import { NovaAgent } from "./nova";
import { HermesAgent } from "./hermes";
import { DevAgent } from "./dev";
import { ScribeAgent } from "./scribe";

// Command
import { AthenaAgent, OracleAgent, NexusAgent } from "./command";

// Engineering
import { ForgeAgent, CipherAgent, SentinelAgent, PatchAgent } from "./engineering";

// Sales
import { TitanAgent, PulseAgent, RexAgent } from "./sales";

// Marketing
import { MuseAgent, BeaconAgent, PrismAgent, EchoAgent } from "./marketing";

// Analytics
import { LensAgent, SageAgent, QuillAgent } from "./analytics";

// Operations
import { VaultAgent, FluxAgent, KronosAgent } from "./operations";

// Finance
import { MintAgent, VoltAgent } from "./finance";

// Research
import { DarwinAgent, AtlasAgent, SiloAgent } from "./research";

export const REGISTRY: Record<string, BaseAgent> = {
  // Command
  jarvis:  new JarvisAgent(),
  athena:  new AthenaAgent(),
  oracle:  new OracleAgent(),
  nexus:   new NexusAgent(),

  // Engineering
  forge:    new ForgeAgent(),
  cipher:   new CipherAgent(),
  sentinel: new SentinelAgent(),
  patch:    new PatchAgent(),
  dev:      new DevAgent(),

  // Sales
  nova:   new NovaAgent(),
  hermes: new HermesAgent(),
  titan:  new TitanAgent(),
  pulse:  new PulseAgent(),
  rex:    new RexAgent(),

  // Marketing
  muse:   new MuseAgent(),
  beacon: new BeaconAgent(),
  prism:  new PrismAgent(),
  echo:   new EchoAgent(),

  // Analytics
  scribe: new ScribeAgent(),
  lens:   new LensAgent(),
  sage:   new SageAgent(),
  quill:  new QuillAgent(),

  // Operations
  vault:  new VaultAgent(),
  flux:   new FluxAgent(),
  kronos: new KronosAgent(),

  // Finance
  ledger: new LedgerAgent(),
  mint:   new MintAgent(),
  volt:   new VoltAgent(),

  // Research
  darwin: new DarwinAgent(),
  atlas:  new AtlasAgent(),
  silo:   new SiloAgent(),
};

export function getAgent(key: string): BaseAgent | undefined {
  return REGISTRY[key];
}
