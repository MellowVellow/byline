/** Mock Explore dataset — ported verbatim from Explore mode feel test.html (retrieved 2 Nov 2026). */
export interface SourceRecord {
  t: string
  a: string
  d: string
  ty: string
  v: string
  u: string
}
export type CheckState = 'supported' | 'contradicted' | 'unverified' | 'na'

export interface ResearchRow {
  id: number
  type: string
  text: string
  main: string | null
  st: CheckState
  refs: Array<[string, string]>
  why: string
  psg: string | null
  mat: string
}

export const SRC: Record<string, SourceRecord> = {
  S1: { t: 'Generative AI enhances individual creativity but reduces the collective diversity of novel content', a: 'Anil R. Doshi, Oliver P. Hauser', d: '12 Jul 2024', ty: 'Peer-reviewed', v: 'Science Advances 10(28)', u: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11244532' },
  S1a: { t: 'AI found to boost individual creativity, at the expense of less varied content', a: 'ScienceDaily (research news)', d: '12 Jul 2024', ty: 'News / press', v: 'ScienceDaily', u: 'https://www.sciencedaily.com/releases/2024/07/240712222127.htm' },
  S1b: { t: 'New study on AI-assisted creativity reveals an interesting social dilemma', a: 'PsyPost', d: 'n/a', ty: 'News / press', v: 'PsyPost', u: 'https://psypost.org/new-study-on-ai-assisted-creativity-reveals-an-interesting-social-dilemma' },
  S1c: { t: 'AI found to boost individual creativity, but results in less varied content', a: 'University of Exeter', d: 'n/a', ty: 'News / press', v: 'University press release', u: 'https://news.exeter.ac.uk/?p=13749' },
  S2: { t: 'Experimental evidence on the productivity effects of generative artificial intelligence', a: 'Shakked Noy, Whitney Zhang', d: '14 Jul 2023', ty: 'Peer-reviewed', v: 'Science 381(6654)', u: 'https://www.science.org/doi/10.1126/science.adh2586' },
  S2a: { t: 'Study finds ChatGPT boosts worker productivity for some writing tasks', a: 'Zach Winn (MIT News, via Phys.org)', d: '17 Jul 2023', ty: 'News / press', v: 'Phys.org', u: 'https://phys.org/news/2023-07-chatgpt-boosts-worker-productivity-tasks.pdf' },
  S2b: { t: 'Experimental evidence on the productivity effects of generative AI (blog post)', a: 'University of Westminster blog', d: 'n/a', ty: 'Blog', v: 'Westminster AI blog', u: 'https://blog.westminster.ac.uk/ai/experimental-evidence-on-the-productivity-effects-of-generative-artificial-intelligence/' },
  S3: { t: 'Can LLMs Generate Novel Research Ideas? A Large-Scale Human Study with 100+ NLP Researchers', a: 'Chenglei Si, Diyi Yang, Tatsunori Hashimoto', d: '6 Sep 2024', ty: 'Preprint', v: 'arXiv:2409.04109', u: 'https://arxiv.org/pdf/2409.04109' },
  S4: { t: 'When ChatGPT is gone: Creativity reverts and homogeneity persists', a: 'Qinghan Liu and 3 others', d: '11 Jan 2024', ty: 'Preprint', v: 'arXiv:2401.06816', u: 'https://arxiv.org/abs/2401.06816v1' },
  S5: { t: 'Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task', a: 'Nataliya Kosmyna and 7 others', d: '10 Jun 2025', ty: 'Preprint', v: 'arXiv:2506.08872', u: 'https://arxiv.org/abs/2506.08872' },
  S5a: { t: 'Cognitive Debt: The Logical Extension of Cognitive Offloading', a: 'Justice Swan', d: 'n/a', ty: 'Blog', v: 'Architecture & Governance', u: 'https://www.architectureandgovernance.com/?p=4112' },
  S5b: { t: "Your Brain on ChatGPT: A Cognitive Neuroscientist's Breakdown", a: 'Donnisa Edmonds', d: 'n/a', ty: 'Blog', v: 'C2ST, University of Chicago', u: 'https://www.c2st.org/?p=20545' },
  S6: { t: "Effects of ChatGPT use on undergraduate students' creativity: a threat to creative thinking?", a: 'Radu Bogdan Toma, Iraya Yánez-Pérez', d: 'Oct 2024', ty: 'Peer-reviewed', v: 'Discover Artificial Intelligence 4(1)', u: 'https://doi.org/10.1007/s44163-024-00172-x' },
  S7: { t: "Creativity in the Age of AI: Evaluating the Impact of Generative AI on Design Outputs and Designers' Creative Thinking", a: 'not in retrieved text', d: 'n/a', ty: 'Preprint', v: 'arXiv:2411.00168', u: 'https://arxiv.org/pdf/2411.00168' },
}

export const ROWS: ResearchRow[] = [
  { id: 1, type: 'Fact', text: 'Stories written with GPT-4 story ideas were rated more creative, better written and more enjoyable. Gains were largest for less creative writers.', main: 'S1', st: 'supported', refs: [['S1', 'primary'], ['S1a', 'echo'], ['S1b', 'echo'], ['S1c', 'echo']], why: 'The primary paper reports this result directly. Three news pages repeat it, but only the paper counts.', psg: 'In an online experiment, writers who could request AI story ideas produced stories that evaluators scored higher on creativity, writing quality and enjoyment, especially writers with low baseline creativity.', mat: 'This is your strongest evidence for the claim that AI helps individual output.' },
  { id: 2, type: 'Fact', text: 'AI-assisted stories were more similar to each other than stories written without AI.', main: 'S1', st: 'supported', refs: [['S1', 'primary'], ['S1b', 'echo']], why: "Stated in the primary paper's abstract.", psg: 'The authors found that stories produced with AI ideas resembled each other more than stories by humans alone, and describe this as a narrower range of novel content across writers.', mat: "This is the counterweight to row 1. It shifts the question from 'less creative?' to 'less varied?'." },
  { id: 3, type: 'Data', text: 'Five AI ideas raised novelty by 10.7% and usefulness by 11.5% for less creative writers.', main: 'S1c', st: 'unverified', refs: [['S1c', 'press'], ['S1', 'context']], why: 'These figures appeared only in a university press release. The primary paper was retrieved, but the retrieved text did not show these numbers. Not counted as supported.', psg: 'The press release gives percentage gains for the group with five AI ideas versus no AI ideas, split by writers\u2019 baseline creativity.', mat: "Check the exact figures in the paper's results section before quoting them." },
  { id: 4, type: 'Data', text: 'ChatGPT cut writing time by 40% and raised graded quality by 18% in a trial of 453 professionals.', main: 'S2', st: 'supported', refs: [['S2', 'primary'], ['S2a', 'echo'], ['S2b', 'echo']], why: "Both figures are in the primary paper's abstract.", psg: 'A preregistered online experiment gave occupation-specific writing tasks to 453 college-educated professionals and randomly exposed half to ChatGPT. Average time fell by 40% and quality rose by 18%.', mat: 'Productivity is not creativity. The tasks were mid-level professional writing.' },
  { id: 5, type: 'Claim', text: '\u201cLLM-generated ideas are less novel than expert human ideas.\u201d', main: 'S3', st: 'contradicted', refs: [['S3', 'primary']], why: 'The primary study found the opposite for novelty. Scope limit: NLP prompting research ideas, judged blind, not executed.', psg: '79 expert reviewers blind-scored 49 ideas per condition. AI ideas scored 5.64 on novelty versus 4.84 for human experts (p<0.05), and slightly lower on feasibility. The agent also produced many duplicate ideas as output grew.', mat: 'Careful: this contradicts the claim for one domain. It does not show AI is more creative in general.' },
  { id: 6, type: 'Claim', text: '\u201cUsing AI permanently reduces creativity.\u201d', main: 'S4', st: 'unverified', refs: [['S4', 'context'], ['S6', 'context'], ['S7', 'context'], ['S5', 'context'], ['S5a', 'echo']], why: 'Not supported and not contradicted. Retrieved studies cover 7 days to 10 weeks and disagree. None tests permanence. One blog post states a stronger version than its source.', psg: 'A 30-day lab study (n=61) saw creative performance return to baseline once ChatGPT was removed, while idea similarity persisted. A 10-week study of 31 undergraduates found no evidence of harm. A third paper calls for longitudinal studies.', mat: "Safe wording: 'short-term studies are mixed, long-term effects are untested'." },
  { id: 7, type: 'Fact', text: 'Writers using an LLM showed weaker EEG connectivity than writers using no tools. Search-engine users fell in between.', main: 'S5', st: 'supported', refs: [['S5', 'primary'], ['S5b', 'context']], why: 'Reported by the primary preprint. Limits: preprint, 54 participants (18 per group), one essay task.', psg: 'Across three groups of 18, the authors report the strongest and most distributed networks for brain-only writers and the weakest for LLM users.', mat: "Weaker connectivity during a task is not proof of lasting harm. The authors' own framing is cautious." },
  { id: 8, type: 'Opinion', text: 'LLM reliance builds up \u201ccognitive debt\u201d.', main: 'S5', st: 'na', refs: [['S5', 'primary'], ['S5a', 'echo']], why: 'An interpretation by the authors, not a measured result.', psg: 'The authors read their EEG, essay and recall results as a warning about potential cognitive costs of relying on an AI assistant.', mat: 'Attribute it to the authors. Do not state it as fact.' },
  { id: 9, type: 'Terminology', text: 'Cognitive debt: the cumulative cost of handing thinking work to an AI tool.', main: 'S5', st: 'na', refs: [['S5', 'primary']], why: 'A term introduced by this paper.', psg: 'The title and abstract introduce the phrase to describe the cost they suspect builds up over repeated LLM use.', mat: 'Define it on first use. It is not yet a settled term.' },
  { id: 10, type: 'Terminology', text: 'Homogenization: AI-assisted outputs becoming more alike across writers.', main: 'S1', st: 'na', refs: [['S1', 'primary'], ['S4', 'context']], why: 'Used in both the story and 30-day studies.', psg: 'Both papers measure how similar ideas or stories become when people use the same AI tool.', mat: "Useful bridge between the 'individual gain' and 'collective loss' arguments." },
  { id: 11, type: 'Question', text: 'Does an AI-driven boost last once the tool is removed?', main: null, st: 'na', refs: [['S4', 'context'], ['S6', 'context']], why: 'Open. Retrieved studies point in different directions.', psg: null, mat: 'A good thesis question for an essay, because the evidence is split.' },
  { id: 12, type: 'Idea', text: "Frame it as a social dilemma: each writer gains, but the field's range narrows.", main: null, st: 'na', refs: [['S1', 'context']], why: 'Derived idea.', psg: null, mat: 'The paper itself uses this framing, so cite it when you write the section.' },
]

export const CHECK_LABEL: Record<CheckState, string> = {
  supported: '\u2713 Supported',
  contradicted: '\u2715 Contradicted',
  unverified: '? Unverified',
  na: '\u2014',
}

export const SOURCE_TYPES = ['Peer-reviewed', 'Preprint', 'News / press', 'Blog'] as const

/** Typed stub for the future live-search swap (V4 uses mock). */
export interface ExploreAPI {
  search(query: string, allowed: string[]): Promise<ResearchRow[]>
}
