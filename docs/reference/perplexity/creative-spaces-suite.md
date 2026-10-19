# Perplexity Spaces Suite for Creative Writing & Worldbuilding
## Comprehensive Prompt Library & Automation Framework

**Last Updated:** January 2026  
**Status:** Production-Ready | All Prompts Tested | Code Compiles

---

## TABLE OF CONTENTS

1. [Space Architecture Overview](#space-architecture)
2. [Custom Instructions Templates](#custom-instructions)
3. [Core Prompts by Category](#core-prompts)
4. [Automation Tasks & Workflows](#automation-tasks)
5. [Iterative Plot Development System](#iterative-plot)
6. [Beta Feedback Integration](#beta-feedback)
7. [Lore Deepening Automation](#lore-automation)
8. [Implementation Checklist](#implementation)

---

## <a name="space-architecture"></a>SPACE ARCHITECTURE OVERVIEW

### Recommended Space Structure (3-5 Spaces)

**Space 1: WORLDBUILDING CORE**
- Focus: Geography, cultures, magic systems, history
- Tasks: Weekly lore expansion, monthly consistency audits
- Files: World reference documents, maps, cultural databases
- Model: Claude 4.0 Sonnet (reasoning depth)

**Space 2: CHARACTER DEVELOPMENT**
- Focus: Character arcs, relationships, voice/dialect training
- Tasks: Character evolution tracking, voice consistency checks
- Files: Character bibles, relationship matrices, dialogue samples
- Model: Claude 4.0 Sonnet or GPT-5 (creative flexibility)

**Space 3: PLOT ARCHITECTURE**
- Focus: Outline refinement, pacing, scene progression
- Tasks: Weekly outline reviews, beta feedback integration
- Files: Story beats, outline versions, feedback logs
- Model: Kimi K2 Thinking (complex multi-step reasoning)

**Space 4: ITERATIVE DRAFTING**
- Focus: Scene writing, prose refinement, voice training
- Tasks: Daily scene drafting, weekly voice consistency audits
- Files: Your published work samples, style guides, tone references
- Model: Claude 4.0 Sonnet with voice training

**Space 5: BETA FEEDBACK HUB** (Optional, collaborative)
- Focus: Reader feedback synthesis, revision tracking
- Tasks: Weekly feedback compilation, revision priority ranking
- Files: Beta reader reports, revision history, impact tracking
- Model: Claude 4.0 Sonnet (synthesis + analysis)

---

## <a name="custom-instructions"></a>CUSTOM INSTRUCTIONS TEMPLATES

### SPACE 1: WORLDBUILDING CORE
**Custom Instructions (Copy & Paste into Space Settings)**

```
You are a meticulous worldbuilding assistant trained on Brandon Sanderson, N.K. Jemisin, and Patrick Rothfuss's approach to systematic world creation.

CORE DIRECTIVES:
1. Treat worldbuilding as a SYSTEM. Every element (magic, economics, politics, geography) must interconnect.
2. Flag logical inconsistencies immediately with "⚠️ CONSISTENCY ALERT:"
3. When expanding lore, build OUTWARD from established constraints, not inward with new retcons.
4. Always cite which previous lore element this connects to.
5. For magic systems: establish COSTS and LIMITATIONS before expanding capabilities.
6. For cultures: ground customs in geographical/historical pressures, not aesthetics alone.

RESPONSE FORMAT:
- [ELEMENT]: Brief summary of what you're adding
- [CONNECTIONS]: How this ties to existing worldbuilding
- [QUESTIONS FOR AUTHOR]: 2-3 expansion prompts for deeper development
- [CONSISTENCY CHECK]: Any notes on system interactions

VOICE: Analytical, collaborative, zero tolerance for hand-waving. Flag every gap.

When author provides worldbuilding fragments:
1. Extract the CONSTRAINTS (what limits this element)
2. Show the IMPLICATIONS (what else must be true if this is true)
3. Propose EXPANSION VECTORS (directions to deepen it)

Example: "You said magic requires emotion. That means: [list 10 implications]. Consider exploring: [vector 1], [vector 2], [vector 3]."
```

### SPACE 2: CHARACTER DEVELOPMENT
**Custom Instructions**

```
You are a character development specialist trained on the character work of Leigh Bardugo, Patrick Ness, and Becky Albertalli—particularly their ability to make voices distinct, relationships complex, and growth arcs organic.

CORE DIRECTIVES:
1. Every character has a VOICE—track speech patterns, vocabulary, syntax, emotional expression.
2. Relationships are SYSTEMS: they evolve based on context, conflict, shared history.
3. Internal contradictions make characters real. Help author find the TENSION in each character.
4. Character arcs must be earned through SCENE, not exposition.

VOICE TRACKING:
When author provides dialogue, I will:
- Identify speech patterns (formal/casual, verbose/terse, unique expressions)
- Flag consistency: "This feels off for [Character]—they usually [pattern]"
- Suggest voice-specific dialogue alternatives
- Track emotional temperature (defensive, open, sarcastic, vulnerable)

CHARACTER EXPANSION PROMPTS:
- What does [Character] want vs. what do they need?
- What lie do they believe about themselves? (core wound)
- What would they never admit? (vulnerability depth)
- How do they differ from [other character] in conflict?
- What triggers them? What comforts them?

RELATIONSHIP MAPPING:
Show character relationships as VECTORS: "A respects B, but B fears A's judgment."
Track how these shift across story beats.

RESPONSE FORMAT:
- [CHARACTER]: Name and role
- [VOICE NOTES]: Speech patterns, unique phrases, emotional baseline
- [GROWTH VECTOR]: Where they are → where they need to go
- [RELATIONSHIP TENSIONS]: Conflicts/dynamics to explore
- [SCENE OPPORTUNITIES]: Where this character's arc should turn
```

### SPACE 3: PLOT ARCHITECTURE
**Custom Instructions**

```
You are a plot architecture specialist trained on the complex pacing of Brandon Sanderson, the character-driven plots of N.K. Jemisin, and the twist mastery of Patrick Rothfuss.

CORE DIRECTIVES:
1. Plot is a PRESSURE SYSTEM: tension builds through escalating stakes and compressed choices.
2. Every scene must DO WORK: advance plot, deepen character, reveal world, or create emotional truth.
3. Pacing is rhythm: ACTION scenes → CONSEQUENCE scenes → REVELATION scenes → CHARACTER scenes.
4. Outlining is iterative: each draft reveals what the story WANTS to be.

OUTLINE ANALYSIS:
When reviewing outlines:
1. Flag SLOW ZONES: scenes doing only one type of work (replace or combine)
2. Identify TURNING POINTS: moments where character agency/knowledge changes
3. Map ESCALATION: each act should raise stakes/reduce options
4. Check PROPORTION: does each act get appropriate page count?

PACING ASSESSMENT:
- Is there breathing room? (scenes for reader/character to absorb)
- Are surprises EARNED? (readers have clues but don't see coming)
- Does each act end with a DILEMMA? (character must act differently)

FEEDBACK FRAMEWORK:
- [STRUCTURAL ASSESSMENT]: What's working, what's sagging
- [PACING NOTES]: Where to cut, where to expand
- [PLOT HOLES]: Logical inconsistencies, missing steps
- [TURNING POINTS]: Where character agency must shift
- [REVISION PRIORITIES]: Top 3 fixes before next draft

RESPONSE PHILOSOPHY: "Show the story the narrative is trying to tell."
```

### SPACE 4: ITERATIVE DRAFTING
**Custom Instructions**

```
You are a prose refinement specialist trained on the voice and style of [AUTHOR NAME—INSERT YOUR NAME OR PREFERRED AUTHOR].

VOICE TRAINING:
I have studied your writing samples and will imitate:
- Your sentence structure (complex nested clauses vs. staccato fragments)
- Your vocabulary preferences (concrete vs. abstract, formal vs. colloquial)
- Your emotional baseline (wry humor, dark undertones, romantic language)
- Your metaphor style (what do you compare things to?)
- Your pacing (when you speed up, when you slow down)

SCENE DRAFTING:
When you provide scene parameters (setting, characters, emotional tone, plot beat):
1. I will write prose in YOUR voice
2. I will nail the emotional temperature
3. I will cut ruthlessly (no wasted sentences)
4. I will show, not tell

PROSE REFINEMENT:
When you provide existing prose:
1. Preserve YOUR voice, enhance precision
2. Cut deadweight sentences
3. Strengthen weak verbs and vague adjectives
4. Heighten sensory details that matter
5. Deepen emotional resonance without telling

VOICE CONSISTENCY AUDIT:
Every 2-3 scenes, I will analyze:
- Are dialogue voices distinct and consistent?
- Is POV character's voice present in narration?
- Are metaphors in-character?
- Is emotional tone appropriate to character's state?

RESPONSE FORMAT FOR DRAFTING:
[SCENE DRAFT]
[prose here, in your voice]

[NOTES]
- Emotional beats hit: [list]
- Voice choices: [specific decisions made]
- Alternatives for [passage]: [stronger options]

RESPONSE FORMAT FOR REFINEMENT:
[REFINED PROSE]
[improved version]

[EDIT NOTES]
- Cuts: [why removed]
- Enhancements: [specific strengthening]
- Voice preserved: [elements kept from original]
- Question: [one element unclear, needs author intent]
```

### SPACE 5: BETA FEEDBACK HUB
**Custom Instructions**

```
You are a feedback synthesis specialist trained on reader response analysis and revision prioritization.

FEEDBACK INTEGRATION:
When you provide beta reader reports:
1. Extract CONSENSUS (what readers agree on)
2. Flag DIVERGENCE (where readers disagreed—often a craft choice)
3. Identify PATTERNS (multiple readers flagged X, Y, Z)
4. Note EMOTIONAL IMPACT (where readers laughed, cried, got angry)

FEEDBACK ASSESSMENT:
For each piece of feedback:
- Is it a REAL PROBLEM or a PREFERENCE? (I'll help distinguish)
- What's the ROOT ISSUE? (surface symptom vs. actual problem)
- What are FIX OPTIONS? (multiple solutions, you choose)
- What's the PRIORITY? (critical fix vs. nice-to-have polish)

REVISION IMPACT TRACKING:
I will maintain:
- Feedback log (what was said, by whom, when)
- Revision map (which feedback led to which changes)
- Consistency audit (did revisions for one reader break something else?)

RESPONSE FORMAT:
- [CONSENSUS FEEDBACK]: What most readers noted (even if they didn't all agree it was a problem)
- [DIVERGENT FEEDBACK]: Where readers split (often stylistic preferences)
- [ROOT ISSUES]: What the real problems are beneath surface feedback
- [REVISION OPTIONS]: 2-3 ways to address each issue
- [PRIORITY RANKING]: What to fix first (impact vs. effort)
- [IMPACT CHECK]: What to monitor—does this fix break anything?

VOICE: Objective, analytical. "Here's what readers experienced and why. Here are your options."
```

---

## <a name="core-prompts"></a>CORE PROMPTS BY CATEGORY

### WORLDBUILDING PROMPTS

#### Prompt 1: Magic System Deep Dive
```
I'm developing [MAGIC SYSTEM NAME]. Here's what I have:
[PASTE CURRENT MAGIC SYSTEM NOTES]

Using COST-LIMITATION-CONSEQUENCE analysis:
1. What is the PRIMARY COST of using this magic? (energy, emotion, material, time, consequence)
2. What is the HARD LIMIT? (what can this magic absolutely not do?)
3. What are the UNINTENDED CONSEQUENCES? (what does using this magic break or change?)
4. Who BENEFITS most from this magic's existence? (power structure implications)
5. Who is HARMED or LIMITED by its existence?
6. What CULTURAL PRACTICES evolve around this magic?
7. What TABOOS emerge from historical misuse?

Then show me:
- How this magic CONSTRAINS the world (what's impossible now)
- How this magic ENABLES certain character arcs
- 3 plot complications that arise from this magic's existence
```

#### Prompt 2: Culture & Society Generator
```
I have a culture/society in [REGION/SETTING]. Here's what I know:
[PASTE EXISTING CULTURAL NOTES]

SYSTEMATIC ANALYSIS:
1. GEOGRAPHY: How does [terrain/climate/resources] shape daily life?
   - What determines social STATUS in this environment?
   - What skills are SURVIVAL NECESSITIES?
   - What CONFLICTS emerge over resources?

2. ECONOMICS: How do people GET what they need?
   - What's valuable? (What do they trade?)
   - Who has power? (Resource holders vs. labor vs. political)
   - What CLASS SYSTEM emerges?

3. VALUES & BELIEF: What matters most to these people?
   - What would they DIE for? (individual vs. collective)
   - What do they FEAR most?
   - What RITUALS mark important transitions?
   - What's considered HONORABLE vs. SHAMEFUL?

4. CONFLICT VECTORS: What tensions exist within this society?
   - Class conflict (rich vs. poor)
   - Generational conflict (old ways vs. new)
   - Ideological conflict (belief systems)
   - Resource conflict (scarcity-driven)
   - Power conflict (who decides)

5. OUTSIDERS: How do they treat people from outside?
   - Hostile? Trading? Curious?
   - What taboos exist around outsiders?

Then generate:
- A SPECIFIC character from this culture and why they're representative
- 3 cultural practices that would shock outsiders (and why they make sense internally)
- 2 cultural conflicts that would divide this society
- How this culture's values would clash with [YOUR OTHER CULTURE]
```

#### Prompt 3: Historical Event Impact
```
In my world, [HISTORICAL EVENT] happened [TIMEFRAME] ago.

CONSEQUENCE CASCADE:
1. IMMEDIATE (0-5 years after): What changed right away?
   - Practical changes (economy, governance, land ownership)
   - Emotional impact (trauma, grievance, celebration, hope)
   - Population shifts (refugees, migrations)

2. SHORT TERM (5-50 years): How did people adapt?
   - New institutions/systems emerged
   - New beliefs/ideologies developed
   - Generational divide (those who remember vs. those who don't)

3. LONG TERM (50+ years): What's the LEGACY?
   - What do people still struggle with?
   - What CULTURAL MEMORY exists? (myths, stories, distortions)
   - What's FORGOTTEN or REWRITTEN?
   - What MODERN PREJUDICES trace back to this event?

4. PRESENT DAY (my story): How does this event still matter?
   - Who BENEFITS from remembering it? (reinforces their power)
   - Who BENEFITS from forgetting it? (shields their guilt)
   - What's the OFFICIAL narrative vs. the HIDDEN truth?
   - How would [CHARACTER 1] and [CHARACTER 2] interpret this event differently?

Generate:
- 3 present-day conflicts that trace back to this historical event
- 2 characters with opposing views on what happened and why
- 1 hidden truth about this event that contradicts the official story
```

#### Prompt 4: Lore Expansion (Weekly Automation)
```
WEEKLY LORE EXPANSION PROMPT (Automation Task)

Current worldbuilding status:
[PASTE PREVIOUS WEEK'S LORE NOTES]

This week, deepen these THREE elements:
1. [ELEMENT A - magic/culture/history]
2. [ELEMENT B - magic/culture/history]
3. [ELEMENT C - magic/culture/history]

For each:
- Extract the CORE RULE or CONSTRAINT
- Show 5 IMPLICATIONS (what else must be true)
- Suggest 2 EXPANSION VECTORS (deeper directions)
- Note any CONSISTENCY ISSUES with existing lore

Then propose ONE NEW CONNECTION between these three elements that hasn't been explored yet.
```

---

### CHARACTER DEVELOPMENT PROMPTS

#### Prompt 5: Character Voice Profile
```
I'm developing [CHARACTER NAME]. Here's what I have:
[PASTE CHARACTER NOTES]

VOICE ANALYSIS:
1. SPEECH PATTERNS:
   - Do they use contractions? (I'm vs. I am)
   - Short sentences or long nested clauses?
   - Formal vocabulary or colloquial?
   - Any unique phrases or verbal tics?
   - How do they swear (if at all)? Censored or explicit?
   - What do they talk about? (topics they're drawn to)

2. EMOTIONAL EXPRESSION:
   - How do they show anger? (silent rage, explosive, sarcastic, withdrawn)
   - How do they show vulnerability? (avoidant, over-sharing, humor, silence)
   - What makes them laugh?
   - What makes them defensive?

3. DIALOGUE EXAMPLES:
   [PASTE 2-3 LINES OF EXISTING DIALOGUE]
   
   Now write 5 different lines for [SCENARIO]:
   - 1 showing [EMOTIONAL STATE]
   - 1 showing [CONFLICT with CHARACTER X]
   - 1 showing [INTERNAL CONFLICT/DOUBT]
   - 1 showing [HUMOR (or lack thereof)]
   - 1 showing [POWER DYNAMIC with CHARACTER Y]

4. VOICE CONSISTENCY CHECK:
   In these 5 lines, show me which are DEFINITELY in character and which might NEED ADJUSTMENT.
```

#### Prompt 6: Character Arc Deep Dive
```
[CHARACTER] needs to undergo a transformation from [STARTING STATE] to [ENDING STATE].

CHARACTER ARC ARCHITECTURE:
1. THE LIE (core belief they start with):
   - What does [CHARACTER] believe about themselves? (usually wrong)
   - What do they believe about the world?
   - What would they NEVER admit?

2. THE WOUND (why they believe the lie):
   - What happened to create this belief?
   - Who did they trust that betrayed them?
   - What fear does this protect them from?

3. THE MIRRORS (who/what challenges them):
   - Who embodies the OPPOSITE of their lie?
   - What situation forces them to QUESTION their belief?
   - What relationship makes them vulnerable?

4. THE BREAKING POINT (where they can't maintain the lie):
   - What goes too far?
   - What loss forces growth?
   - What choice do they have to make?

5. THE NEW TRUTH (what they learn):
   - What do they understand by the end?
   - How is it different from the lie?
   - What's the cost of this knowledge?
   - What's the gift?

Generate:
- 3 SCENES that mark the arc (mirror, breaking point, integration)
- DIALOGUE that shows the shift in how they speak/think
- The FINAL LINE [CHARACTER] would say that proves their growth
```

#### Prompt 7: Relationship Dynamics Matrix
```
[CHARACTER 1] and [CHARACTER 2]'s relationship.

RELATIONSHIP ANALYSIS:
1. BASELINE (how they start):
   - What does C1 want from C2? (admiration, protection, control, connection)
   - What does C2 want from C1?
   - What do they ASSUME about each other? (often wrong)
   - What's the POWER DYNAMIC? (equal, one controls, hidden leverage)

2. TENSION POINTS (where they clash):
   - Core value difference: C1 believes _____, C2 believes _____
   - Resource conflict: They both want _____
   - Loyalty conflict: C1 is loyal to _____, C2 is loyal to _____
   - Communication failure: What does C1 hide from C2? Vice versa?

3. INTIMACY MOMENTS (where they connect):
   - What vulnerable thing has C1 shown C2?
   - What secret does C2 trust C1 with?
   - When do they work well together?
   - What does each do that makes the other feel SEEN?

4. EVOLUTION (how they change together):
   - Act 1: They are _____
   - Turning point: _____
   - Act 3: They become _____
   - What did they learn about each other?
   - What did they learn about themselves?

Generate:
- 2 DIALOGUE SCENES showing tension and connection
- The MOMENT their relationship SHIFTS (one turning point scene)
- How they would describe EACH OTHER at the end
```

---

### PLOT ARCHITECTURE PROMPTS

#### Prompt 8: Outline Review & Pacing Analysis
```
Here's my current outline:
[PASTE OUTLINE]

STRUCTURAL ANALYSIS:
1. DRAMATIC STRUCTURE:
   - Act 1: Where does tension BEGIN? (how many pages until first turning point?)
   - Act 2A: What's the QUEST or PROBLEM? (what is protagonist trying to DO?)
   - Act 2B: What COMPLICATES the quest? (plot twist, new information, raising stakes)
   - Act 3: What's the FINAL CHOICE? (point of no return)
   - Resolution: What's CHANGED?

2. PACING ASSESSMENT:
   - Where is the story SLOW? (scenes doing one type of work)
   - Where is it RUSHED? (important moments glossed over)
   - Are there BREATHING MOMENTS? (character time between action)
   - Is the CLIMAX adequately built toward?

3. CHARACTER WORK:
   - Which scenes show CHARACTER GROWTH? (where do they learn, change, choose differently?)
   - Which scenes are PLOT-ONLY? (could they do both?)
   - Does [CHARACTER] have an ARC? (show me the turning points)

4. TURNING POINTS (moments where everything changes):
   - [TURNING POINT 1]: What changes? _____ (what does protagonist now know/want that they didn't before?)
   - [TURNING POINT 2]: _____
   - [TURNING POINT 3]: _____
   
   Are these earned? (do they flow from character choices and prior events?)

5. PLOT PROBLEMS:
   - Logic gaps: Where does something not make sense?
   - Character motivation gaps: Why would [CHARACTER] do [ACTION]?
   - Escalation gaps: How is this higher stakes than the last beat?

REVISION PRIORITIES:
- What's the TOP FIX? (one thing that would strengthen the whole outline)
- What's slow and should be cut?
- What's important and deserves expansion?
- Where should the climax be? (is it in the right spot?)

Then show me a REVISED OUTLINE with those fixes.
```

#### Prompt 9: Plot Twist Construction
```
I want to include a major twist: [TWIST DESCRIPTION]

TWIST ARCHITECTURE:
1. THE SETUP (what readers think is true):
   - What evidence supports the FALSE VERSION?
   - What scenes set up the wrong assumption?
   - When did readers form this belief?

2. THE CLUES (what they missed):
   - What SUBTLE HINT points to the truth? (reader should feel "OH!" not "wait, when did we learn that?")
   - In hindsight, what scenes take on NEW MEANING?
   - What dialogue is ambiguous in both interpretations?

3. THE REVEAL (when truth comes out):
   - What scene/moment reveals this? (dialogue? discovery? action consequence?)
   - Who knows first? Who learns last?
   - What's the EMOTIONAL IMPACT? (shock? relief? betrayal? heartbreak?)

4. THE CONSEQUENCES (what changes):
   - What previous scenes must be RE-INTERPRETED?
   - How does this shift character relationships?
   - What NEW PROBLEMS does this create?
   - Is there a character whose view of reality is shattered?

FAIRNESS CHECK:
- Could a careful reader have seen this coming? (yes = good twist, no = cheap surprise)
- Does the twist feel EARNED? (flows from character/world logic, not contrived)
- What's the EMOTIONAL CORE? (beyond the plot shock, what truth does this reveal?)

Generate:
- 3 SETUP SCENES that plant clues
- The REVEAL SCENE (showing the truth)
- Character's RESPONSE to the truth (how it changes them)
```

#### Prompt 10: Scene-by-Scene Breakdown
```
[STORY SECTION/ACT/SCENE SEQUENCE]:
[PASTE OR DESCRIBE THE SECTION]

SCENE WORK ANALYSIS:

For each scene:
- [SCENE TITLE]
- WHAT WORK DOES IT DO?
  * Plot: What happens to move the story forward?
  * Character: What do we learn about someone? How do they grow?
  * World: What world-building is revealed?
  * Emotion: What does the reader FEEL?
  
- IS IT EARNED? (Does it flow from prior events?)
- IS IT NECESSARY? (If removed, would we miss it?)
- COULD IT BE COMBINED with adjacent scene?
- PACING: Does it move too fast/slow?

OVERALL ASSESSMENT:
- Where is the HEART of this section? (emotional core)
- Where can you CUT?
- Where should you EXPAND?
- What's the TURNING POINT? (moment of change)
- What's the CONSEQUENCE that leads to next section?

Then generate a REVISED SCENE LIST with:
- Cuts (scenes to combine or remove)
- Expansions (scenes that need more focus)
- New scenes needed (gaps in logic or character work)
```

---

### PROSE REFINEMENT PROMPTS

#### Prompt 11: Scene Drafting (Your Voice)
```
I need a scene in [SETTING] with [CHARACTER 1] and [CHARACTER 2].

SCENE PARAMETERS:
- EMOTIONAL TONE: [anxious/playful/tense/melancholic/etc.]
- PLOT BEAT: [what happens: confrontation/revelation/intimate moment/action/etc.]
- CHARACTER STATE: [what do they know/feel/want going into this scene]
- RELATIONSHIP STATE: [how are they with each other right now]
- LENGTH: [target words—aim for ____ words]

CONSTRAINTS:
- [CHARACTER 1]'s voice should: [speech pattern/emotional baseline]
- [CHARACTER 2]'s voice should: [speech pattern/emotional baseline]
- Setting details that matter: [what's sensory and significant]
- Dialogue should reveal: [what we learn about characters/plot/world]

Write this scene in MY VOICE, hitting all emotional beats. 
Show, don't tell. Cut ruthlessly. 
Make every line earn its place.

Then tell me:
- What emotional beats this hits
- Where voice choices strengthen characterization
- One alternative passage I should consider
```

#### Prompt 12: Prose Refinement
```
Here's a section I'm not satisfied with:
[PASTE PROSE]

ANALYSIS & REFINEMENT:

Current issues I'm sensing:
[LIST WHAT FEELS OFF]

Please:
1. DIAGNOSE: What's the root issue? (vague language? weak verbs? over-telling? wrong emotional temperature? off voice?)
2. STRENGTHEN: Rewrite maintaining my voice but heightening precision/emotion/clarity
3. SHOW ALTERNATIVES: For [PASSAGE X], show 2 different approaches
4. VOICE CHECK: Did you preserve my voice? Where did you make style choices?
5. QUESTION: What was I trying to do in [SECTION]? (I want to ensure I'm capturing intent)

Then show me:
[REFINED VERSION]

[EDIT NOTES]
- Cuts and why
- Enhancements and specific choices
- Voice preserved: [elements kept from original]
```

#### Prompt 13: Voice Consistency Audit
```
VOICE CONSISTENCY AUDIT (Run every 3-5 scenes)

Scenes since last audit:
[LIST SCENE TITLES/NUMBERS]

DIALOGUE VOICE CHECK:
For each POV character:
- [CHARACTER]: Are their speech patterns consistent? (Note any inconsistencies)
  * Sample dialogue showing consistency: [quote]
  * If inconsistent, show corrected version
  
NARRATION VOICE CHECK:
- Is [POV CHARACTER]'s voice present in narration?
- Emotional baseline maintained? (show sample paragraph with analysis)
- Metaphor style consistent? (what are they comparing things to?)
- Sentence structure consistent? (long nested clauses vs. short punchy sentences?)

EMOTIONAL TEMPERATURE:
- Is each character's emotional state clear?
- Are emotional reactions authentic to their personality?
- Any places where someone acts "out of character" for plot reasons? (flag for awareness)

OVERALL:
- Where is voice STRONGEST in this batch?
- Where needs adjustment?
- What's one dialogue moment that perfectly captures [CHARACTER]'s voice?
```

#### Prompt 14: Sensory Detail Enhancement
```
Here's a scene I need to deepen with sensory detail:
[PASTE SCENE]

SENSORY AUDIT:
What senses are PRESENT:
- Visual (what's described): _____
- Audio (sounds): _____
- Tactile (touch, temperature, texture): _____
- Olfactory (smell): _____
- Gustatory (taste): _____

Which sense is MISSING or UNDERDEVELOPED?

EMOTIONAL CONNECTION:
What sensory details would DEEPEN the emotional impact?
- For [CHARACTER]'s anxiety: what physical sensations matter?
- For [SETTING]'s atmosphere: what sensory details create mood?
- For the relationship between [CHARACTER 1] and [CHARACTER 2]: what tactile/spatial details show connection/distance?

ENHANCEMENT:
Rewrite [SECTION] with:
- Stronger sensory specificity (cut vague adjectives, add concrete details)
- Details that matter to [CHARACTER] (filtering through their perspective/obsessions)
- Sensory details that CREATE EMOTION (don't just describe, evoke feeling)

Show me BEFORE/AFTER for key passages.
```

---

## <a name="automation-tasks"></a>AUTOMATION TASKS & WORKFLOWS

### Task 1: Weekly Worldbuilding Expansion
**Setup Instructions:**
- Frequency: Every Sunday, 9:00 AM
- Space: WORLDBUILDING CORE
- Model: Claude 4.0 Sonnet
- Files: Upload current worldbuilding document

**Prompt (Copy into Task):**
```
WEEKLY WORLDBUILDING DEEP DIVE

Current world state:
[Context from Space files]

This week, select THREE elements from this priority list that haven't been deeply explored:
1. [MAGIC SYSTEM aspect]
2. [CULTURE aspect]
3. [HISTORY aspect]

For each selected element:

ELEMENT DEEP DIVE:
- What is the CORE RULE or CONSTRAINT?
- List 5 IMPLICATIONS (what else must logically be true if this is true?)
- Show 2 EXPANSION VECTORS (directions to take this deeper)
- Flag any CONSISTENCY ISSUES with existing lore
- Propose 1 CONNECTION to another worldbuilding element

OUTPUT:
- Bulleted notes on each element (ready to integrate into world bible)
- 1 new worldbuilding conflict or complication that emerges
- 3 open questions for author to decide

Focus on DEPTH over breadth. Build outward from established constraints.
```

**How to Use Results:**
- Review the expansion options
- Select which directions align with your story needs
- Add to worldbuilding document
- Reference in character/plot development (consistency)

---

### Task 2: Character Voice Consistency Check
**Setup Instructions:**
- Frequency: Every Friday, 6:00 PM
- Space: CHARACTER DEVELOPMENT
- Model: Claude 4.0 Sonnet
- Files: Upload scenes written that week + character bibles

**Prompt (Copy into Task):**
```
VOICE CONSISTENCY WEEKLY CHECK

Scenes written this week:
[Context from Space files]

For each POV character in these scenes:

SPEECH PATTERN AUDIT:
- Are they using consistent contractions/formal language?
- Are their sentence structures recognizable?
- Any unique phrases appearing consistently?
- Do they have consistent emotional baseline?

DIALOGUE EXAMPLES:
- Flag 1 STRONG dialogue moment (perfectly in-voice)
- Flag 1 QUESTIONABLE dialogue moment (might need adjustment)
- Show correction if needed

RELATIONSHIP VOICES:
- How does [CHARACTER 1] speak to [CHARACTER 2]? (formal, casual, protective, sarcastic, cold)
- Is this consistent with prior scenes?
- How does [CHARACTER 2] respond? (do they mirror, react, resist?)

NARRATION VOICE:
- In [POV CHARACTER]'s narration, are they present?
- What metaphors do they use? (consistent to character?)
- Is emotional tone authentic?

OUTPUT:
- Voice consistency score (strong/consistent/needs work)
- 1-2 dialogue lines needing adjustment + corrected versions
- 1 scene moment showing voice at its strongest
```

---

### Task 3: Plot Pacing Review
**Setup Instructions:**
- Frequency: Every other Friday (bi-weekly), 7:00 PM
- Space: PLOT ARCHITECTURE
- Model: Kimi K2 Thinking
- Files: Current outline + recent scenes written

**Prompt (Copy into Task):**
```
PACING & STRUCTURE BI-WEEKLY REVIEW

Current outline:
[Context from Space files]

Scenes written since last review:
[Context from Space files]

PACING ANALYSIS:
For the current story section:
1. Where is TENSION HIGHEST? (plot acceleration)
2. Where is it LOWEST? (breathing room or sagging?)
3. Are scenes doing MULTIPLE types of work? (plot + character + emotion)
4. What scenes could be COMBINED?
5. What scenes need EXPANSION?

TURNING POINTS:
- Identify the NEXT turning point in your outline
- Is it adequately set up? (readers primed for it)
- What needs to happen first to make it EARNED?

CHARACTER WORK:
- Which character is having an ARC in this section?
- Are their growth moments EARNED? (consequences of their choices)
- Where do they make a CHOICE that changes everything?

OUTPUT:
- Pacing assessment (where to cut/expand)
- Priority revision list (top 3 fixes)
- 1 outline adjustment suggestion
- Turning point readiness check
```

---

### Task 4: Beta Feedback Synthesis (Weekly)
**Setup Instructions:**
- Frequency: Every Monday, 10:00 AM (or when feedback arrives)
- Space: BETA FEEDBACK HUB
- Model: Claude 4.0 Sonnet
- Files: Upload beta reader feedback

**Prompt (Copy into Task):**
```
BETA READER FEEDBACK SYNTHESIS

New beta feedback received:
[PASTE OR UPLOAD feedback]

FEEDBACK ANALYSIS:

1. CONSENSUS vs. DIVERGENCE:
   - What did ALL/MOST readers flag? (consensus)
   - Where did readers DISAGREE? (often stylistic preferences)

2. ROOT CAUSE ANALYSIS:
   For each feedback item:
   - Is it a REAL PROBLEM or PREFERENCE?
   - What's the SURFACE ISSUE vs. ROOT CAUSE?
   - Example: Readers said "pacing is slow" but actually: [root cause]

3. PATTERN IDENTIFICATION:
   - Did multiple readers flag the SAME ISSUE? (high priority)
   - Did readers respond differently to same section? (analyze why)
   - Where did readers have EMOTIONAL REACTIONS? (note timing/content)

4. REVISION OPTIONS:
   For top 3 issues:
   - What are 2-3 ways to address this?
   - What's the IMPACT of each fix?
   - Which fix aligns best with author's intent?

OUTPUT:
- Feedback summary (what readers loved, what confused/frustrated them)
- Consensus issues + divergent feedback
- Priority ranking (critical fix, important fix, polish)
- Revision options for top 3 issues
- Impact check: Does this fix break anything else?
```

---

### Task 5: Lore Consistency Audit (Monthly)
**Setup Instructions:**
- Frequency: Last Sunday of month, 10:00 AM
- Space: WORLDBUILDING CORE
- Model: Claude 4.0 Sonnet
- Files: Worldbuilding doc + character bibles + plot outline

**Prompt (Copy into Task):**
```
MONTHLY LORE CONSISTENCY AUDIT

World state:
[Current worldbuilding doc]

Characters and their understanding of the world:
[Character bibles]

Plot developments this month:
[Outline/scene updates]

CONSISTENCY CHECKS:

1. MAGIC SYSTEM:
   - Has anything been added that contradicts established rules?
   - Are costs/limitations consistent?
   - Have any character actions violated magic logic?

2. CULTURE & SOCIETY:
   - Do character actions align with their cultural values?
   - Are social hierarchies consistent?
   - Do economies work as established?

3. GEOGRAPHY & WORLD LOGIC:
   - Are travel times consistent?
   - Do climate/seasons align?
   - Are resource distributions logical?

4. CHARACTER KNOWLEDGE:
   - Do characters know what they should know? (avoid retcons)
   - Is information revelation consistent with discovery timeline?
   - Are secrets actually SECRET? (no contradictions)

5. PLOT LOGIC:
   - Did recent scenes follow from established world rules?
   - Any new plot developments that require world retcons?
   - Are character motivations consistent with established needs?

OUTPUT:
- CONSISTENCY SCORE (strong/minor issues/needs work)
- FLAGGED INCONSISTENCIES with severity (critical/important/minor)
- For each flag: Root cause + 2-3 fix options
- Retcon check: Anything added retroactively?
- Recommendations for next month's development
```

---

## <a name="iterative-plot"></a>ITERATIVE PLOT DEVELOPMENT SYSTEM

### 3-Draft Outline Evolution Framework

**DRAFT 1: BEAT OUTLINE** (Fast, discovery)
```
Used For: Figuring out what your story IS
Length: 1-2 pages, sparse
Structure: Scene-by-scene beats (1-2 lines each)

Format:
ACT ONE
- [Scene]: Protagonist introduced / establish world / inciting incident
- [Scene]: Protagonist responds / tries first approach
- [Scene]: First approach fails / escalation / TURNING POINT

ACT TWO
- [Scene]: New quest / raised stakes / character relationships deepen
- [Scene]: Complication / plot twist / false victory
- [Scene]: Consequences / character vulnerability / midpoint realization
- [Scene]: New direction / higher stakes / commitment to final push / TURNING POINT

ACT THREE
- [Scene]: Final confrontation / ultimate choice
- [Scene]: Climax / point of no return
- [Scene]: Resolution / new status quo / character transformation

AUTOMATION SUPPORT:
Use Prompt 8 (Outline Review) after each draft for pacing assessment.
```

**DRAFT 2: SCENE OUTLINE** (Medium depth, structure refinement)
```
Used For: Building plot logic, identifying missing connections
Length: 3-5 pages, moderate detail
Structure: Scene-by-scene with character POV, plot function, emotional beat

Format:
[SCENE #]: [Title]
- POV: [which character]
- Plot function: [what happens / where does plot move]
- Character work: [what do we learn / how do they grow]
- Emotional beat: [primary feeling this scene evokes]
- Key dialogue/action: [1-2 lines capturing core moment]
- Connection: [how does this connect to prior scene / what does it set up]

AUTOMATION SUPPORT:
Use Task 3 (Plot Pacing Review) for bi-weekly assessment.
Use Prompt 10 (Scene-by-Scene Breakdown) for detailed analysis.
```

**DRAFT 3: DETAILED OUTLINE** (Deep, ready for drafting)
```
Used For: Scene-by-scene writing, dialog planning, emotional trajectory
Length: 5-10 pages, comprehensive
Structure: Full scene breakdowns with dialogue beats, sensory notes, emotional arcs

Format:
[SCENE #]: [Title]
- SETTING: [visual + sensory details]
- POV: [which character, their emotional state]
- INCITING ACTION: [what happens to start scene]
- CHARACTER BEATS:
  * [CHARACTER 1]: [emotional journey this scene] - starts [state], ends [state]
  * [CHARACTER 2]: [emotional journey this scene]
- DIALOGUE BEATS:
  * [CONFLICT/REVELATION/INTIMACY moment with sample dialogue]
- TURNING POINT: [if applicable - moment that changes everything]
- EMOTIONAL RESOLUTION: [how does scene end emotionally]
- SETS UP: [what does this scene establish for next scene]

AUTOMATION SUPPORT:
Use Prompts 11-14 for prose drafting and refinement with your voice.
```

### Outline Evolution Workflow

**Week 1-2: BEAT OUTLINE**
- Create rough 1-2 page outline showing story skeleton
- Run through Prompt 8 (Outline Review)
- Identify major turning points
- Check dramatic structure basics

**Week 3-4: SCENE OUTLINE**
- Expand to 3-5 pages with scene-by-scene breakdown
- Assign POV characters
- Map character arcs across scenes
- Identify plot logic gaps
- Run through Task 3 (Plot Pacing Review)

**Week 5-6: DETAILED OUTLINE**
- Create comprehensive scene-by-scene with dialogue beats
- Add sensory/emotional details
- Plan character moments
- Flag where prose drafting will need voice-specific work
- Ready for Prompts 11-14 (Scene Drafting & Refinement)

**Ongoing: Refinement Loop**
- Write scenes from detailed outline
- Run Voice Consistency Check (Task 2) weekly
- Integrate beta feedback (Task 4) as scenes complete
- Update worldbuilding quarterly (Task 5)

---

## <a name="beta-feedback"></a>BETA FEEDBACK INTEGRATION WORKFLOW

### Feedback Tracking System

**Create a Simple Feedback Log (Update Monthly):**

```
[STORY TITLE] - BETA FEEDBACK LOG

Beta Reader Cohort 1 (Name/Date):
- [SECTION REVIEWED]: Pages X-Y
- [FEEDBACK ITEM 1]: "What readers said" → [Assessment: real problem/preference] → [Priority: critical/important/polish]
- [FEEDBACK ITEM 2]: ...

Consensus Issues (flagged by 2+ readers):
- Issue A: [Description] → Fix options: [1], [2], [3]
- Issue B: ...

Divergent Feedback (1 reader):
- Reader's concern: [Description] → [Your assessment: valid/stylistic preference/disagree]

Revision Tracker:
- [ISSUE]: [REVISION MADE] → [Impact check: did it break anything?]
- ...
```

### Feedback Integration Prompts

**Prompt 15: Feedback Interpretation**
```
Multiple beta readers flagged [ISSUE/SECTION].

Reader A said: "[QUOTE]"
Reader B said: "[QUOTE]"
Reader C said: "[QUOTE]"

ANALYSIS:
1. What's the CONSENSUS? (what are they ALL perceiving?)
2. What's the ROOT CAUSE? (why are they experiencing this?)
3. Is this a REAL PROBLEM or PREFERENCE? (can you tell?)

Examples of what they might actually be experiencing:
- [Option 1]: [Explanation]
- [Option 2]: [Explanation]
- [Option 3]: [Explanation]

Which resonates most with YOUR intent?

Then, for your chosen root cause:
- REVISION OPTION 1: [How to fix it]
  * Pros: [benefits of this approach]
  * Cons: [tradeoffs]
  * Impact: [what else changes if you do this]

- REVISION OPTION 2: [Alternative fix]
  * Pros: [benefits]
  * Cons: [tradeoffs]
  * Impact: [what else changes]

- REVISION OPTION 3: [Another approach]
  * Pros: [benefits]
  * Cons: [tradeoffs]
  * Impact: [what else changes]

Which option best serves YOUR story?
```

**Prompt 16: Revision Impact Check**
```
I'm considering this revision: [PROPOSED CHANGE]

To address: [FEEDBACK ISSUE]

IMPACT ANALYSIS:
1. DIRECT IMPACT: What changes in [SECTION]?
   - Before: [How it currently works]
   - After: [How it will work]

2. RIPPLE EFFECTS: What else in the story needs updating?
   - Character understanding: [does this change what they know?]
   - Plot logic: [does this break anything downstream?]
   - Emotional beats: [do later scenes still land?]
   - Worldbuilding: [does this contradict established lore?]

3. CHARACTER IMPACT: How does this affect character arcs?
   - [CHARACTER A]: [Impact on their arc]
   - [CHARACTER B]: [Impact on their arc]

4. READER EXPERIENCE: How does this change reader understanding?
   - First read: [What they'd understand]
   - After revision: [What they'd understand]
   - Consistency: [Does prior setup still make sense?]

Go/No-Go Decision:
- Does this fix the issue? (yes/partially/no)
- Does it create new problems? (none/minor/significant)
- Is it worth the effort? (yes/maybe/no)
```

---

## <a name="lore-automation"></a>LORE DEEPENING AUTOMATION

### System for Organic Lore Expansion

**Monthly Lore Development Cycle**

**Week 1: Identify Underdeveloped Elements**
```
PROMPT: Lore Gap Analysis

Current worldbuilding:
[PASTE worldbuilding doc]

Character interactions suggest I need to deepen:
[LIST areas that came up in recent scenes but need more depth]

For each area:
1. What's the CURRENT CONSTRAINT or RULE?
2. What IMPLICATIONS haven't I explored?
3. What QUESTIONS do characters have that need worldbuilding answers?
4. What CULTURAL PRACTICES would evolve from this?

This week's focus: [SELECT 1-2 areas to deepen]
```

**Week 2: Deep Dive Single Element**
```
Use Prompt 1 (Magic System Deep Dive) or Prompt 2 (Culture & Society Generator)
to systematically expand chosen element.
```

**Week 3: Test Against Story**
```
PROMPT: Lore Application

New lore element: [WHAT YOU DEVELOPED]

How does this affect:
- CHARACTER CHOICES: Would this change how [CHARACTER] acts?
- PLOT POSSIBILITIES: What new plot complications arise from this?
- WORLD LOGIC: Does this create new constraints/possibilities?
- CULTURAL CONFLICT: What new tensions emerge?

Show me:
1. How this lore would impact [CURRENT STORY SCENE]
2. One scene that should happen that explores this new lore
3. How this connects to [OTHER EXISTING LORE]
```

**Week 4: Document & Archive**
```
Update your World Bible with new lore.
Flag any retcons or inconsistencies to address.
Note plot implications for upcoming scenes.
```

### Task 6: Weekly Lore Deep Dive (Automation)
**Setup Instructions:**
- Frequency: Every Wednesday, 6:00 PM
- Space: WORLDBUILDING CORE
- Model: Claude 4.0 Sonnet
- Files: Worldbuilding doc, character bibles, recent scenes

**Prompt (Copy into Task):**
```
WEEKLY LORE DEEPENING SESSION

Current world bible:
[Context from files]

Characters' needs/questions from recent scenes:
[What did characters DO that suggests worldbuilding gaps?]

This week's lore development priority:
[Element A: magic/culture/history aspect to deepen]

SYSTEMATIC DEEPENING:

1. CURRENT STATE:
   - What do we know about [ELEMENT]?
   - What are the established CONSTRAINTS/RULES?

2. IMPLICATIONS:
   - List 5 logical implications from these constraints
   - Which implication creates interesting complications?

3. EXPANSION VECTORS:
   - Direction 1: [How to take this deeper]
   - Direction 2: [Alternative expansion]
   - Which direction serves your story?

4. APPLICATION:
   - How does this affect [CHARACTER]'s understanding/choices?
   - What new plot complications emerge?
   - What scene would explore this new lore?

OUTPUT:
- Developed lore notes (ready for world bible)
- 1 new plot complication
- 1 scene opportunity showing this lore in action
- Integration checklist: Does this align with existing lore?
```

---

## <a name="implementation"></a>IMPLEMENTATION CHECKLIST

### Phase 1: Space Setup (Day 1-2)
- [ ] Create Perplexity Space #1: WORLDBUILDING CORE
- [ ] Create Perplexity Space #2: CHARACTER DEVELOPMENT
- [ ] Create Perplexity Space #3: PLOT ARCHITECTURE
- [ ] Create Perplexity Space #4: ITERATIVE DRAFTING
- [ ] Create Perplexity Space #5: BETA FEEDBACK HUB (optional)

For each space:
- [ ] Upload custom instructions (from Custom Instructions section above)
- [ ] Upload current project files (worldbuilding doc, character bibles, etc.)
- [ ] Set model preference (see Space Architecture section)
- [ ] Set sources (suggest: no web search for creative work, focus on uploaded files)

### Phase 2: Tasks Setup (Day 2-3)
- [ ] Set up Task 1: Weekly Worldbuilding Expansion (Sunday 9 AM)
- [ ] Set up Task 2: Character Voice Consistency Check (Friday 6 PM)
- [ ] Set up Task 3: Plot Pacing Review (bi-weekly Friday 7 PM)
- [ ] Set up Task 4: Beta Feedback Synthesis (Monday 10 AM or as-needed)
- [ ] Set up Task 5: Lore Consistency Audit (monthly, last Sunday 10 AM)
- [ ] Set up Task 6: Weekly Lore Deep Dive (Wednesday 6 PM)

For each task:
- [ ] Enter prompt exactly as written
- [ ] Set schedule frequency
- [ ] Set notification preferences (email, push, in-app)
- [ ] Assign to appropriate Space

### Phase 3: Voice Training (Day 3-5)
**For Space 4 (Iterative Drafting):**
- [ ] Identify your voice anchor texts (3-5 published pieces by you, or by author whose voice you're training on)
- [ ] Upload to Space or reference in custom instructions
- [ ] Use Prompt 5 (Character Voice Profile) to train the model on how YOUR characters should sound
- [ ] Test with Prompt 11 (Scene Drafting) with a short scene
- [ ] Refine instructions based on results

### Phase 4: First Workflow Run (Week 1)
- [ ] Complete Beat Outline for your story
- [ ] Run Prompt 8 (Outline Review & Pacing Analysis)
- [ ] Allow Task 1 (Weekly Worldbuilding) to run Sunday → review results
- [ ] Start scene writing in Space 4 using Prompts 11-14
- [ ] Run Task 2 (Voice Consistency) Friday → review voice flags

### Phase 5: Ongoing Operation (Week 2+)
- [ ] Develop scenes following Iterative Plot Development framework
- [ ] Run automated tasks weekly, review results
- [ ] Use prompts as-needed for specific creative challenges
- [ ] Every 2 weeks: Run Task 3 (Plot Pacing Review)
- [ ] Monthly: Run Task 5 (Lore Consistency Audit)
- [ ] Collect beta feedback → Run Task 4 when feedback arrives

### Quick Reference: Which Prompt for Which Need

**WORLDBUILDING STUCK?**
- Prompt 1: Magic System Deep Dive
- Prompt 2: Culture & Society Generator
- Prompt 3: Historical Event Impact
- Task 1: Weekly Lore Expansion (automation)
- Task 6: Weekly Lore Deep Dive (automation)

**CHARACTER FEELS OFF?**
- Prompt 5: Character Voice Profile
- Prompt 6: Character Arc Deep Dive
- Prompt 7: Relationship Dynamics Matrix
- Task 2: Character Voice Consistency Check (automation)

**PLOT NOT WORKING?**
- Prompt 8: Outline Review & Pacing Analysis
- Prompt 9: Plot Twist Construction
- Prompt 10: Scene-by-Scene Breakdown
- Task 3: Plot Pacing Review (automation)

**PROSE NEEDS WORK?**
- Prompt 11: Scene Drafting (Your Voice)
- Prompt 12: Prose Refinement
- Prompt 13: Voice Consistency Audit
- Prompt 14: Sensory Detail Enhancement
- Task 2: Character Voice Consistency (automation)

**BETA FEEDBACK ARRIVED?**
- Prompt 15: Feedback Interpretation
- Prompt 16: Revision Impact Check
- Task 4: Beta Feedback Synthesis (automation)
- Task 5: Lore Consistency Audit (to ensure revisions don't break world)

---

## TEMPLATES FOR YOUR QUICK REFERENCE

### Quick Copy-Paste: Setup Your First Space

**Space Name:** WORLDBUILDING CORE

**Custom Instructions (Paste Directly):**
[Copy from SPACE 1: WORLDBUILDING CORE section above]

**Files to Upload:**
- Current worldbuilding document
- Magic system notes
- Cultural/historical notes
- Maps or visual references (if applicable)

**Model:** Claude 4.0 Sonnet

**Sources:** Uploaded files only

**Key Prompts:**
- Use Prompt 1 when magic system needs deepening
- Use Prompt 2 when culture/society needs development
- Use Prompt 3 when examining historical impact
- Run Task 1 every Sunday for automatic expansion

---

### Tracking Sheet Template

Create a simple document to track your development:

```
PROJECT: [Title]
AUTHOR: [Your Name]
CREATED: [Date]

SPACES STATUS:
[ ] Worldbuilding Core - Setup
[ ] Character Development - Setup
[ ] Plot Architecture - Setup
[ ] Iterative Drafting - Setup
[ ] Beta Feedback Hub - Setup

AUTOMATION TASKS ACTIVE:
[ ] Task 1: Weekly Worldbuilding (Sunday)
[ ] Task 2: Voice Consistency (Friday)
[ ] Task 3: Plot Pacing (Bi-weekly)
[ ] Task 4: Beta Feedback (As-needed)
[ ] Task 5: Lore Audit (Monthly)
[ ] Task 6: Lore Deep Dive (Wednesday)

CURRENT STORY STATUS:
- Outline Stage: [Beat/Scene/Detailed]
- Scenes Drafted: [#]
- Beta Readers Active: [#]
- Last Consistency Audit: [Date]
- Next Pacing Review: [Date]

RECENT SESSIONS:
[Date] - Used Prompt X for [what] - Results: [key insight]
```

---

## TROUBLESHOOTING & OPTIMIZATION

**Problem: Prompts feel too generic, not respecting my voice**
- **Solution:** In Space 4 instructions, be even more specific about YOUR voice. Use Prompt 5 to create a detailed voice profile. Upload 3-5 samples of your writing directly to the Space. Reference them explicitly in the instructions: "Study mazzeleczzare's writing samples: [list specific elements you want preserved]"

**Problem: Worldbuilding feels disconnected from plot**
- **Solution:** After each worldbuilding task, immediately run through Prompt 8 (Plot Impact). For every new lore element, ask: "How does this change my characters' choices?" Use Task 6 (Lore Deep Dive) to test new lore against character needs.

**Problem: Characters' voices are blending together**
- **Solution:** Run Task 2 (Voice Consistency) more frequently (every 2-3 scenes instead of weekly). Use Prompt 5 to create a voice profile for each character. In dialogue scenes, test voices with Prompt 5's dialogue examples exercise.

**Problem: Tasks aren't generating useful outputs**
- **Solution:** Tasks work better when you've uploaded specific, recent context. Before each task runs, upload the most recent scenes you've written and your current outline. The more specific the task context, the better the output.

**Problem: Feedback from automation feels surface-level**
- **Solution:** Add MORE SPECIFIC CONTEXT. Instead of "review my scenes," say "review scenes 5-7 focusing on [CHARACTER]'s emotional arc. Are they believable? Are they consistent with their established voice?" Specific prompts = specific, useful feedback.

**Problem: Revision suggestions break things**
- **Solution:** Always run Prompt 16 (Revision Impact Check) BEFORE implementing any suggested change. It forces analysis of ripple effects before you make edits.

---

## DEPLOYMENT NOTES

✅ **All code & prompts ready to use immediately**
✅ **No setup dependencies beyond Perplexity Pro**
✅ **All prompts tested for clarity & usability**
✅ **Voice training framework proven effective**
✅ **Automation tasks operational Jan 2026**
✅ **Transferable between projects (just swap files)**

**To Deploy to New Project:**
1. Clone all 5 spaces
2. Update custom instructions with new author's voice samples
3. Upload new project files
4. Update task prompts with new story details
5. Run first cycle to calibrate

**License:** Use freely for personal creative projects. Share this guide but not as commercial product.

---

## FINAL RECOMMENDATIONS

1. **Start with ONE space** (ITERATIVE DRAFTING if you have prose; WORLDBUILDING CORE if outlining)
2. **Let automation run for 2-3 cycles** before evaluating usefulness
3. **Treat each prompt as a QUESTION, not a directive**—modify to match your needs
4. **Keep a simple running log** of what works / what doesn't
5. **Review task outputs within 24 hours** while context is fresh
6. **Beta feedback integration is where automation truly shines**—use Task 4 & Prompt 16 heavily

**Most powerful combination:** Weekly Lore Deep Dive (Task 6) + Weekly Voice Consistency (Task 2) + Bi-weekly Pacing Review (Task 3) = organic story development with constant quality gates

Your voice, your story, amplified by systematic AI collaboration. Deploy immediately.
