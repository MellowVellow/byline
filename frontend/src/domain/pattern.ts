export type ConnectCategory =
  | 'Addition'
  | 'Contrast'
  | 'Cause and effect'
  | 'Evidence'
  | 'Concession'
  | 'Comparison'
  | 'Elaboration'
  | 'Qualification'
  | 'Synthesis'
  | 'Sequence'
  | 'Example'
  | 'Problem and solution'

export interface ConnectPattern {
  id: string
  name: string
  category: ConnectCategory
  template: string
  placeholders: string[]
  rationale: string
  example: string
}

export const CONNECT_PATTERNS: ConnectPattern[] = [
  // 1. Contrast
  {
    id: 'pat-contrast-1',
    name: 'Concessive Counter',
    category: 'Contrast',
    template: 'Although [opposing point] is valid, [main argument] remains crucial because [reason].',
    placeholders: ['opposing point', 'main argument', 'reason'],
    rationale: 'Acknowledges valid objection before asserting primary thesis with evidence.',
    example: 'Although upfront capital expenditure is substantial, intercity rail remains crucial because airport congestion imposes severe economic drag.',
  },
  {
    id: 'pat-contrast-2',
    name: 'Sharp Divergence',
    category: 'Contrast',
    template: 'Where [first subject] prioritizes [quality A], [second subject] conversely emphasizes [quality B].',
    placeholders: ['first subject', 'quality A', 'second subject', 'quality B'],
    rationale: 'Highlights direct divergence between two strategic priorities.',
    example: 'Where municipal authorities prioritize immediate debt retirement, transit advocates conversely emphasize multi-decade economic multiplier effects.',
  },
  // 2. Concession
  {
    id: 'pat-concession-1',
    name: 'Nuanced Qualification',
    category: 'Concession',
    template: 'Granted, [conceded point]; nonetheless, [compelling counterweight] cannot be overlooked.',
    placeholders: ['conceded point', 'compelling counterweight'],
    rationale: 'Grants credibility to critic while introducing an overriding factor.',
    example: 'Granted, low suburban density lengthens initial payback horizons; nonetheless, downtown corridor interconnectivity cannot be overlooked.',
  },
  // 3. Cause and effect
  {
    id: 'pat-cause-1',
    name: 'Compounding Consequence',
    category: 'Cause and effect',
    template: 'As a direct consequence of [cause], [immediate result], which ultimately triggers [broader impact].',
    placeholders: ['cause', 'immediate result', 'broader impact'],
    rationale: 'Traces multi-step causality from root driver to systemic outcome.',
    example: 'As a direct consequence of chronic runway delays, business travel predictability plummets, which ultimately triggers regional productivity losses.',
  },
  {
    id: 'pat-cause-2',
    name: 'Structural Causality',
    category: 'Cause and effect',
    template: 'Because [underlying condition] persists, [outcome] follows inevitably unless [intervention].',
    placeholders: ['underlying condition', 'outcome', 'intervention'],
    rationale: 'Frames cause and effect as an imperative for intervention.',
    example: 'Because highway expansion induces suburban sprawl, traffic saturation follows inevitably unless grade-separated transit is deployed.',
  },
  // 4. Evidence
  {
    id: 'pat-evidence-1',
    name: 'Empirical Corroboration',
    category: 'Evidence',
    template: 'Empirical data underscores this point: [finding or statistic] demonstrates that [conclusion].',
    placeholders: ['finding or statistic', 'conclusion'],
    rationale: 'Bridges theoretical claim with grounded observational evidence.',
    example: 'Empirical data underscores this point: federal transit studies demonstrate that electrified rail reduces corridor emissions by seventy percent.',
  },
  // 5. Addition
  {
    id: 'pat-addition-1',
    name: 'Cumulative Weight',
    category: 'Addition',
    template: 'Beyond [initial factor], an equally consequential dimension is [additional factor], which [implication].',
    placeholders: ['initial factor', 'additional factor', 'implication'],
    rationale: 'Stacks supportive arguments sequentially to build momentum.',
    example: 'Beyond operational emissions reductions, an equally consequential dimension is transit equity, which broadens regional labor market mobility.',
  },
  // 6. Comparison
  {
    id: 'pat-comparison-1',
    name: 'Parallel Dynamics',
    category: 'Comparison',
    template: 'Much like [established scenario] proved that [historical outcome], [current scenario] now faces [comparable reality].',
    placeholders: ['established scenario', 'historical outcome', 'current scenario', 'comparable reality'],
    rationale: 'Draws analytical analogy from a precedent to clarify present situation.',
    example: 'Much like the Interstate Highway Act proved that federal investment reshapes commerce, regional rail corridors now face a comparable transformational moment.',
  },
  // 7. Elaboration
  {
    id: 'pat-elaboration-1',
    name: 'Mechanistic Deepening',
    category: 'Elaboration',
    template: 'Specifically, this mechanism functions by [process], thereby allowing [beneficiary] to [benefit].',
    placeholders: ['process', 'beneficiary', 'benefit'],
    rationale: 'Unpacks a high-level abstraction into concrete operational steps.',
    example: 'Specifically, this mechanism functions by linking downtown terminals directly to secondary urban centers, thereby allowing commuters to bypass congested beltways entirely.',
  },
  // 8. Qualification
  {
    id: 'pat-qualification-1',
    name: 'Boundary Condition',
    category: 'Qualification',
    template: 'This principle holds true primarily when [condition A] is met; in contexts marked by [condition B], [different outcome].',
    placeholders: ['condition A', 'condition B', 'different outcome'],
    rationale: 'Specifies explicit boundaries where the argument is valid.',
    example: 'This principle holds true primarily when metropolitan corridors exceed three million residents; in contexts marked by ultra-sparse exurbs, bus rapid transit proves more economical.',
  },
  // 9. Synthesis
  {
    id: 'pat-synthesis-1',
    name: 'Dialectical Resolution',
    category: 'Synthesis',
    template: 'Rather than treating [view A] and [view B] as mutually exclusive, a coherent strategy [integrative action].',
    placeholders: ['view A', 'view B', 'integrative action'],
    rationale: 'Resolves apparent paradox by integrating opposing viewpoints.',
    example: 'Rather than treating fiscal prudence and major infrastructure as mutually exclusive, a coherent strategy pairs targeted debt with value-capture land development.',
  },
  // 10. Sequence
  {
    id: 'pat-sequence-1',
    name: 'Strategic Horizon',
    category: 'Sequence',
    template: 'The immediate priority entails [phase 1]; once [milestone] is secured, focus shifts to [phase 2].',
    placeholders: ['phase 1', 'milestone', 'phase 2'],
    rationale: 'Establishes clear temporal progression for multi-stage plans.',
    example: 'The immediate priority entails securing dedicated rights-of-way; once corridor easements are secured, focus shifts to high-frequency rolling stock deployment.',
  },
  // 11. Example
  {
    id: 'pat-example-1',
    name: 'Concrete Illustration',
    category: 'Example',
    template: 'A salient illustration emerges in [case study], where [action taken] produced [notable result].',
    placeholders: ['case study', 'action taken', 'notable result'],
    rationale: 'Anchors broad assertion in a tangible real-world instance.',
    example: 'A salient illustration emerges in the Northeast Corridor, where electrified express service captured seventy-five percent of the regional travel market.',
  },
  // 12. Problem and solution
  {
    id: 'pat-problem-1',
    name: 'Root Remediation',
    category: 'Problem and solution',
    template: 'To resolve the deadlock posed by [core challenge], [proposed solution] directly addresses [root cause] rather than [symptom].',
    placeholders: ['core challenge', 'proposed solution', 'root cause', 'symptom'],
    rationale: 'Pivots from diagnostic breakdown to targeted systemic intervention.',
    example: 'To resolve the deadlock posed by project cost overruns, standardized procurement directly addresses regulatory fragmentation rather than cutting transit frequencies.',
  },
]
