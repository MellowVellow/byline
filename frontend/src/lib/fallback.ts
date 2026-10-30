import type { Issue, Reaction, Reading, ConnectOption } from './types'
/** Canned demo data when backend unreachable (Vercel static demo). Anchored by exact quotes from sample. */
export const SAMPLE_DOC = `<h1>Cats or dogs: choosing a first pet</h1><p>Cats are independent, as I said. Dogs needs daily walks. A plethora of reasons exist for choosing a cat. Cats live longer than dogs, so they are clearly the better long-term choice.</p><p>Cats are quiet. Dogs bark. Studies show that dog owners are always happier than cat owners. The utilisation of a litter box facilitates a paradigm shift in home hygiene. Finally, cats are just cute.</p><p>In order to make a decision, you should think about your schedule. Dogs needs at least two hours of exercise every day without exception. Cats can be left alone for a weekend, and this proves they need no attention at all. Because cats sleep most of the day, therefore they are the perfect pet for everyone.</p>`
export const SAMPLE_CONTEXT = 'Argue which animal is better, cats or dogs, with at least 2 arguments. Audience: undecided first-time pet owners.'

export const GOLDEN_PATH_SAMPLE_DOC = `<h1>The Infrastructure Dilemma: High-Speed Rail in North America</h1><p>Critics frequently point to astronomical upfront capital expenditure and persistent debt loads incurred by regional transit authorities. In sprawling metropolitan regions, low population density often lengthens the payback horizon of dedicated rights-of-way.</p><p>Intercity air travel corridors face worsening ground delays and saturated runways that constrain economic productivity. Strategic electrification of mid-distance transit hubs offers exponential reductions in carbon intensity while interconnecting regional labor markets.</p>`
export const GOLDEN_PATH_SAMPLE_CONTEXT = 'Synthesize arguments on North American rail infrastructure: balancing municipal capital debt against long-term intercity productivity.'

export const FALLBACK_CONNECT_OPTIONS: ConnectOption[] = [
  {
    relation_type: 'Dialectical Concession',
    bridge_text: 'While initial capital outlays present undeniable fiscal risks, congested airspace imposes an equally severe, compounding economic drain.',
    rationale: 'Concedes municipal fiscal constraints before countering with airport congestion costs.',
  },
  {
    relation_type: 'Causal Synthesis',
    bridge_text: 'Consequently, the question is not whether public debt can be eliminated, but whether capital invested in rail delivers higher societal yield than expanding overburdened airports.',
    rationale: 'Reframes debt as a capital allocation choice between airport expansion and rail.',
  },
  {
    relation_type: 'Comparative Infrastructure',
    bridge_text: 'By contrast, rail corridors between dense regional metros overcome low suburban density by directly linking commercial cores.',
    rationale: 'Directly resolves the density critique by focusing on core-to-core intercity transit.',
  },
]
export const FALLBACK_ISSUES: Issue[] = [
  { quote: 'plethora', context: 'A plethora of reasons exist for choosing a cat.', type: 'vocabulary', reason: 'Word above General level.', replacement: 'many' },
  { quote: 'as I said', context: 'Cats are independent, as I said.', type: 'relevance', reason: 'Refers back to something not yet said.', replacement: '' },
  { quote: 'utilisation of a litter box facilitates a paradigm shift', context: 'The utilisation of a litter box facilitates a paradigm shift in home hygiene.', type: 'vocabulary', reason: 'Buzzword-heavy and far above General level.', replacement: 'using a litter box changes home hygiene' },
  { quote: 'this proves they need no attention at all', context: 'Cats can be left alone for a weekend, and this proves they need no attention at all.', type: 'relevance', reason: 'Overclaims from one example; absolute conclusion does not follow.', replacement: '' },
]
export const FALLBACK_REACTIONS: Reaction[] = [
  { quote: 'as I said', context: 'Cats are independent, as I said.', kind: 'question', text: 'You already mentioned this — where?' },
  { quote: 'Finally, cats are just cute.', context: 'Finally, cats are just cute.', kind: 'critique', text: 'This lands as feeling, not an argument. A reader may not be convinced.' },
  { quote: 'Studies show that dog owners are always happier than cat owners.', context: 'Studies show that dog owners are always happier than cat owners.', kind: 'question', text: 'Which studies? “Always” is a very strong claim with no source.' },
  { quote: 'they are the perfect pet for everyone', context: 'therefore they are the perfect pet for everyone.', kind: 'critique', text: 'Everyone? Allergies, housing, and time differ — this overreaches.' },
]
export const FALLBACK_READINGS: Reading[] = [
  { title: 'How far to walk a dog? — Vital Pet Club', url: 'https://www.vitalpetclub.co.uk', label: 'supports', verdict: 'supports', domain: 'vitalpetclub.co.uk', why: 'Evidence supports the claim as a general guideline: veterinary advice states healthy dogs should have at least one walk a day, preferably two.', excerpt: 'Healthy dogs of all breeds should have at least one walk a day, preferably two.', claim_quote: 'Dogs needs daily walks.', claim_context: 'Cats are independent, as I said. Dogs needs daily walks.' },
  { title: 'Do Cats Live Longer Than Dogs? — PetMD', url: 'https://www.petmd.com', label: 'qualifies', verdict: 'qualifies', domain: 'petmd.com', why: 'Evidence qualifies the claim: indoor cats often outlive dogs on average, but lifespan varies widely by breed, size, and care.', excerpt: 'Cats tend to live longer than dogs on average, especially indoor cats.', claim_quote: 'Cats live longer than dogs', claim_context: 'Cats live longer than dogs, so they are clearly the better long-term choice.' },
]
export const FALLBACK_SUGGESTIONS = ['cost of care', 'Dogs, by comparison, need daily attention', 'A cat can be left alone for a weekend.']
