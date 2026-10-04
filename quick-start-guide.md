# Quick-Start Guide: Perplexity Creative Spaces
## Implementation Templates & Real-World Examples

**Status:** Ready to deploy immediately  
**Format:** Copy-paste templates, customize bracketed fields  
**Updated:** January 2026

---

## PART 1: QUICK-START SETUP (2 HOURS)

### Step 1: Create Your First Space (15 min)

Go to Perplexity > Spaces > Create New Space

```
Space Name: WORLDBUILDING CORE
Description: Systematic worldbuilding expansion and lore consistency
Emoji: 🌍

Custom Instructions (Copy from main guide):
[PASTE: Space 1 Custom Instructions from creative-spaces-suite.md]

Files to Upload:
- Your worldbuilding document (if exists)
- Magic system notes
- Cultural/historical notes
- Any world reference materials
```

### Step 2: Set Up Your Voice Profile (30 min)

Go to Space 4 (ITERATIVE DRAFTING) > Custom Instructions

**Find Your Voice Anchors** (3-5 examples):
- Paste 2-3 published pieces of YOUR writing (or author whose voice you're training on)
- Extract specific voice elements:

```
VOICE ELEMENTS TO HIGHLIGHT:

Sentence structure:
- Example: "[QUOTE]"
- Pattern: [Nested clauses / staccato fragments / mix]

Dialogue authenticity:
- Character voice example: "[DIALOGUE]"
- How they're different from other characters: [specifics]

Metaphor style:
- What do they compare things to: "[METAPHOR]"
- Worldview revealed: [what the metaphors show]

Emotional baseline:
- Tone sample: "[QUOTE]"
- Underlying feeling: [sarcasm, warmth, darkness, humor, etc.]

Vocabulary:
- Formal vs. colloquial: [ratio/examples]
- Technical terms they use: [list]
- Words they avoid: [list]
```

Then add to Space 4 instructions:
```
VOICE TRAINING:

I have studied [YOUR NAME]'s writing samples:
[LIST UPLOADED FILES]

Key voice elements to preserve:
- Sentence structure: [Pattern you identified]
- Dialogue style: [Pattern you identified]
- Metaphor approach: [Pattern you identified]
- Emotional baseline: [Pattern you identified]
- Vocabulary level: [Pattern you identified]

When drafting scenes or refining prose, maintain these elements above all else.
When I suggest alternatives, they should feel like YOUR voice, not generic.
```

### Step 3: Upload Project Files (15 min)

For each Space, upload relevant materials:

**WORLDBUILDING CORE:**
- [ ] Worldbuilding document (current state)
- [ ] Magic system notes
- [ ] Cultural/historical background
- [ ] Maps or world references

**CHARACTER DEVELOPMENT:**
- [ ] Character bibles
- [ ] Character relationship matrices
- [ ] Sample dialogue from your characters

**PLOT ARCHITECTURE:**
- [ ] Current outline (any format)
- [ ] Previous outline drafts (if exists)
- [ ] Scene summaries

**ITERATIVE DRAFTING:**
- [ ] Your published writing samples (for voice training)
- [ ] Style guide or voice notes (if you have)
- [ ] Character voice reference sheets

**BETA FEEDBACK HUB:**
- [ ] Beta reader feedback (when it arrives)
- [ ] Revision tracking sheet

### Step 4: Create First 3 Tasks (1 hour)

Go to Perplexity > Tasks > Create New Task

**Task 1: Weekly Worldbuilding (5 min)**
- Name: `Weekly Worldbuilding Deep Dive - [PROJECT NAME]`
- Frequency: Every Sunday, 9:00 AM
- Space: WORLDBUILDING CORE
- Model: Claude 4.0 Sonnet
- Prompt: [COPY from automation-config.md]

**Task 2: Character Voice Check (5 min)**
- Name: `Weekly Voice Consistency - [PROJECT NAME]`
- Frequency: Every Friday, 6:00 PM
- Space: CHARACTER DEVELOPMENT
- Model: Claude 4.0 Sonnet
- Prompt: [COPY from automation-config.md]

**Task 3: Plot Pacing (5 min)**
- Name: `Bi-Weekly Pacing Review - [PROJECT NAME]`
- Frequency: Every other Friday, 7:00 PM
- Space: PLOT ARCHITECTURE
- Model: Kimi K2 Thinking
- Prompt: [COPY from automation-config.md]

Test each task by clicking "Test" to run it immediately. Review outputs within 24 hours.

---

## PART 2: REAL-WORLD EXAMPLE WORKFLOWS

### Example 1: Developing Magic System

**Scenario:** You have a vague magic system, need to develop it systematically.

**Timeline:**

**Monday, 2 PM** - Manual Prompt
Use Prompt 1 (Magic System Deep Dive)

Input:
```
I'm developing [SYSTEM NAME] magic. Here's what I have:
- Uses emotion as fuel
- Costs: physical exhaustion
- Limited by bloodline/training
- Creates permanent changes to world

Using COST-LIMITATION-CONSEQUENCE analysis:
[Run Prompt 1]
```

Output: Detailed breakdown of costs, limits, implications, cultural practices, taboos

**Wednesday, 6 PM** - Automated Expansion
Task 6 (Weekly Lore Deep Dive) runs automatically
- Deepens one aspect of magic system
- Tests it against character actions
- Suggests new complications

**Sunday, 9 AM** - Automated Deepening
Task 1 (Weekly Worldbuilding Expansion) runs
- Expands implications of magic system
- Shows how it affects economics/politics/society
- Creates new story conflicts

**Result:** By end of week, magic system has gone from vague to detailed, tested, and integrated into world.

---

### Example 2: Voice Training & Character Consistency

**Scenario:** Writing first novel, need to maintain character voices consistently.

**Day 1 Setup (30 min)**
- Upload 3-5 published pieces showing YOUR voice (or anchor author)
- Complete Prompt 5 (Character Voice Profile) for each character
- Document voice patterns:
  * [CHARACTER 1]: "Uses contractions, short sentences, sarcastic, avoids emotion words"
  * [CHARACTER 2]: "Formal speech, long sentences, verbose, emotional"
  * [CHARACTER 3]: "Colloquial, dialect variations, humor, technical jargon"

**Week 1: Scene Writing**
- Monday: Write Scene A with [CHARACTER 1] POV using Prompt 11
- Tuesday: Write Scene B with [CHARACTER 2] POV using Prompt 11
- Wednesday: Write Scene C with [CHARACTER 1] & [CHARACTER 2] dialogue

**Friday 6 PM** - Automated Check
Task 2 (Voice Consistency) runs
- Reviews all 3 scenes
- Flags any voice inconsistencies
- Suggests corrections

**Output example:**
```
[CHARACTER 1] - STRONG
Consistency Score: ⭐⭐⭐⭐⭐
- Used contractions consistently (I'm, don't, wasn't)
- Sentence structure: short, punchy (maintaining patterns)
- Sarcasm shows in dialogue, never tells emotions
Best moment: [QUOTE showing perfect voice]

[CHARACTER 2] - NEEDS ADJUSTMENT
Consistency Score: ⭐⭐⭐⭐
Flag: Scene B, line [X] uses contraction ("I'm")
- This character never contracts speech
- Correction: "I am quite certain..."
Best moment: [QUOTE showing formal eloquence]
```

**Action:** Review Friday evening, fix flagged dialogue, re-run voice check next week.

---

### Example 3: Beta Feedback Integration

**Scenario:** You have beta reader feedback, need to prioritize and implement revisions safely.

**Monday 10 AM** - Feedback Arrives & Task Runs
Task 4 (Beta Feedback Synthesis) runs automatically

Input: 3 beta readers' feedback on Chapters 1-10

Output: Synthesized analysis
```
CONSENSUS ISSUES:
1. Pacing slow in Chapter 3 (all 3 readers flagged)
   - Root cause: Too much description, plot stalls
   - Priority: CRITICAL
   - Fix options: [A] Cut 40% of description, [B] Move description to later chapter, [C] Weave into dialogue

2. [CHARACTER] motivation unclear (2/3 readers)
   - Root cause: His internal conflict not shown enough
   - Priority: IMPORTANT
   - Fix options: [A] Add early scene showing conflict, [B] Revise existing scenes for more internality, [C] Direct dialogue revelation

DIVERGENT (single reader):
- Pacing in Chapter 5 too fast
- Other readers didn't mention this
- Assessment: Likely stylistic preference, but worth monitoring

WHAT WORKED:
✓ Ending of Chapter 5 (emotional impact mentioned by all)
✓ [CHARACTER 2]'s voice (2/3 loved it, 1 wanted more)
✓ Magic system explanation (clear and engaging)
```

**Monday 3 PM** - Impact Check
Run Prompt 16 (Revision Impact Check) manually

For Issue 1 (Pacing in Chapter 3):

```
I'm considering: [FIX OPTION A - Cut description]

IMPACT ANALYSIS:
- Direct impact: Chapter 3 becomes 8 pages instead of 12
- Ripple effects: Does reader understand setting? YES (description remains, just less)
- Character impact: Does [POV CHARACTER] still experience setting? YES
- Later scenes: Does anything set up in description matter later? Check [List scenes]...
  * Scene in Chapter 8 references [detail from description]
  * Need to keep that specific description
  * Can cut: [other descriptive passages]

GO DECISION: YES - Cut 30% description, preserve 3 key details for later setup
```

**Action:** Implement fixes that passed impact check

**Wednesday 6 PM** - Consistency Check
Task 6 (Lore Deep Dive) runs

**Sunday 9 AM** - Full Consistency Audit
Task 5 (Monthly Lore Consistency Audit) runs
- Ensures revisions didn't break worldbuilding
- Checks character knowledge still makes sense
- Validates plot logic after changes

**Result:** Revisions implemented safely, tested for ripple effects, integrated into story.

---

### Example 4: Plot Outline Evolution

**Scenario:** Starting new novel, need to develop outline over 6 weeks.

**Week 1: Beat Outline**
- Manual: Prompt 8 (Outline Review) on beat outline skeleton
- Output: Dramatic structure analysis, turning point identification
- Deliverable: 1-2 page beat outline with 10-15 major scenes

**Week 2-3: Scene Outline**
- Manual: Prompt 10 (Scene-by-Scene Breakdown)
- Output: 3-5 page outline with character POV, emotional beats, character arcs
- Automation: Task 3 runs bi-weekly → pacing feedback
- Deliverable: Scene-by-scene outline ready for prose drafting

**Week 4-6: Detailed Outline**
- Manual: Prompts 11-14 for sample scene drafting from outline
- Output: Detailed outline with dialogue beats, sensory notes
- Automation: Task 2 runs weekly → voice consistency on sample scenes
- Automation: Task 3 runs bi-weekly → ongoing pacing check
- Deliverable: Comprehensive outline, ready to write full novel

**Throughout:**
- Automation: Task 1 (Worldbuilding) expands weekly
- Automation: Task 6 (Lore Deep Dive) deepens context
- Result: Outline and worldbuilding develop together, reinforcing each other

---

## PART 3: TEMPLATE TRACKING SHEET

Create this simple document to track your creative system:

```
PROJECT TITLE: [Your Novel]
AUTHOR: [Your Name]
GENRE: [Genre]
START DATE: [Date]
TARGET COMPLETION: [Date]

SPACES STATUS:
[x] Worldbuilding Core - Active
[x] Character Development - Active
[x] Plot Architecture - Active
[x] Iterative Drafting - Active
[ ] Beta Feedback Hub - (Set up when needed)

TASKS RUNNING:
[x] Task 1: Weekly Worldbuilding (Sundays 9 AM)
[x] Task 2: Voice Consistency (Fridays 6 PM)
[x] Task 3: Plot Pacing (Bi-weekly Fridays 7 PM)
[ ] Task 4: Beta Feedback (On-demand)
[ ] Task 5: Lore Audit (Monthly)
[x] Task 6: Lore Deep Dive (Wednesdays 6 PM)

CURRENT STORY STATUS:
- Outline stage: [Beat / Scene / Detailed]
- Scenes drafted: 0 / [Total Target]
- Worldbuilding depth: [% complete]
- Character bibles: [# of characters fully developed]

VOICE TRAINING:
[x] Voice anchors identified
[x] Voice profile created
[x] First scene tested
[x] Voice flags minimal
[ ] Voice solid enough to draft extensively

WEEKLY LOG:
---
WEEK OF [DATE]:
Monday - [What you accomplished]
Wednesday - [Automation: Task X output, key insight]
Friday - [Automation: Task Y output, action taken]
Sunday - [Automation: Task Z output, worldbuilding integrated]
Next week focus: [What's next]

Prompts used this week: [Prompt X for Y, Prompt Z for Q]
Revisions made: [What changed]
Files updated: [What needs uploading]
---

MONTHLY CONSISTENCY AUDIT:
[Date]: [Overall consistency score] - [Key flags fixed]

BETA FEEDBACK STATUS:
Beta readers: [# readers]
Feedback received: [Date if applicable]
Priority revisions: [List if applicable]
Revisions implemented: [List if applicable]
```

---

## PART 4: TROUBLESHOOTING QUICK REFERENCE

### Problem: Tasks aren't generating useful output

**Check:**
- [ ] Are files uploaded to the Space? (tasks use Space files)
- [ ] Is context specific enough? (generic context = generic output)
- [ ] Is the task prompt complete? (no truncation?)
- [ ] Is the model appropriate? (Claude for creativity, Kimi for reasoning)

**Fix:**
- Upload recent scenes to Space before task runs
- Test task immediately with "Test" button
- Edit prompt to be more specific
- Try different model

**Example:**
```
BEFORE: "Review my worldbuilding for consistency"
AFTER: "Review worldbuilding with focus on magic system costs. 
Chapters 5-8 suggest emotion as fuel, but Chapter 12 shows 
it working without emotion. Which is true? How does this affect plot?"
```

### Problem: Character voices blending together

**Check:**
- [ ] Have you completed Prompt 5 for each character?
- [ ] Are voice differences documented?
- [ ] Is Task 2 (Voice Consistency) running frequently enough?
- [ ] Are you running enough scenes through Task 2?

**Fix:**
- Complete detailed Prompt 5 for each character
- Create comparison document showing voice differences
- Run Task 2 every 2-3 scenes instead of weekly
- Use Prompt 5 to test new scenes before drafting

**Example voice comparison document:**
```
CHARACTER 1: The Skeptic
- Speech: Contractions, short sentences, sarcastic
- Example: "I don't think that'll work. It never does."
- Emotion: Hides through humor, rarely direct
- Unique: Uses hypotheticals ("What if...?")

CHARACTER 2: The Academic
- Speech: Formal, long sentences, technical
- Example: "I hypothesize that such an approach would prove ineffective."
- Emotion: Direct and intellectual
- Unique: Uses citations and references

CHARACTER 3: The Rebel
- Speech: Colloquial, dialect, profanity
- Example: "That ain't gonna happen, not in a million years."
- Emotion: Outward and intense
- Unique: Physical descriptions of feeling ("my heart's racin'")
```

### Problem: Revision broke something

**Checklist:**
- [ ] Did you run Prompt 16 (Revision Impact Check) before making changes?
- [ ] Did you run Task 5 (Lore Consistency Audit) after revisions?
- [ ] Have you checked character knowledge is still consistent?
- [ ] Have you re-read affected scenes?

**Prevention:**
Always run Prompt 16 before implementing ANY revision suggested by feedback or automation.
Run Task 5 monthly, especially after major revisions.
Keep simple revision tracking sheet (what changed, when, why).

### Problem: Too many tasks, overwhelmed

**Solution:**
Start with 3 tasks: Task 1 (Worldbuilding), Task 2 (Voice), Task 3 (Pacing)
Add tasks as you complete projects / need more feedback
Pause any task that doesn't feel useful for 4 weeks, then re-evaluate

**Which tasks are "must-haves":**
- Task 2 (Voice Consistency) - Essential if writing character-driven fiction
- Task 3 (Plot Pacing) - Essential if outline-heavy writer
- Task 1 (Worldbuilding) - Essential if worldbuilding-focused genre

**Which tasks are "nice-to-haves":**
- Task 4 (Beta Feedback) - Only when you have beta readers
- Task 5 (Lore Audit) - Monthly check-in only
- Task 6 (Lore Deep Dive) - If you want organic development

### Problem: Task timing doesn't work for me

**Solution:**
Change task schedule to YOUR timezone and workflow

Example:
- If you write at night: Schedule Task 1 for Monday morning (review over coffee)
- If you write mornings: Schedule Task 2 for evening same day
- If you're weekly checker: Schedule all tasks for same day (e.g., Sunday)

Custom schedules:
```
MORNING WRITER:
- Task 1: Monday morning (worldbuilding deep dive)
- Task 2: Friday morning (voice check before weekend writing)
- Task 3: Bi-weekly Friday morning (pacing review)

EVENING WRITER:
- Task 1: Monday evening (worldbuilding expansion)
- Task 2: Friday evening (voice check before sleep)
- Task 3: Bi-weekly Friday evening (pacing review)

BATCH PROCESSOR:
- All tasks: Sunday afternoon (review all at once)
- Action: Implement all feedback Monday-Friday
```

---

## PART 5: MEASURING SUCCESS

### What to Expect (First Month)

**Week 1-2:**
- Tasks running, you learning to interpret outputs
- Some outputs feel generic (you'll refine as you provide more context)
- Your creative process starts shifting to incorporate feedback loops

**Week 3-4:**
- Outputs becoming more useful and specific
- Patterns emerging (which tasks help most for your process)
- Creative confidence increasing

**Month 2:**
- System running smoothly, requiring minimal maintenance
- Automation becoming backbone of your creative development
- Clear improvement in consistency and depth

### Success Metrics

Track these to measure system effectiveness:

**Worldbuilding Depth:**
- Measure: # of lore elements developed per week (target: 3-5)
- Measure: Consistency audit flags (target: decreasing)
- Goal: Richer, more interconnected world

**Character Consistency:**
- Measure: Voice flags per 5 scenes (target: 1-2 total)
- Measure: Reader feedback on character voices (target: positive)
- Goal: Authentic, distinct character voices

**Plot Strength:**
- Measure: Pacing assessment each review (target: improving over time)
- Measure: # of plot holes caught (target: decreasing)
- Goal: Tight, well-structured story

**Productivity:**
- Measure: Scenes drafted per week (track consistency)
- Measure: Time spent revising vs. writing (target: more time writing)
- Goal: Increased output with decreased revision cycles

**Quality:**
- Measure: Beta feedback themes (target: fewer repeating issues)
- Measure: Revision cycles needed (target: fewer drafts to publication)
- Goal: Cleaner first drafts, less revision needed

---

## PART 6: ADVANCED CUSTOMIZATION

### Creating Custom Tasks for Your Needs

**Template for Custom Task:**

```
TASK NAME: [What this task does]

FREQUENCY: [When should this run?]
SPACE: [Which Space to use?]
MODEL: [Claude/Kimi/GPT-5?]

PROMPT:

[Your specific analysis need here]

Example: "Analyze [STORY ELEMENT] for [SPECIFIC PROBLEM]"

FOR [STORY ELEMENT]:
- Current state: [What exists]
- Problem: [What's not working]
- Analysis needed: [What should the AI analyze?]

Output: [What do you want the AI to provide?]
```

**Examples of Custom Tasks You Could Create:**

1. **Weekly Emotion Temperature Check**
   - Analyzes emotional arc of story section
   - Flags where emotion feels flat or forced
   - Frequency: Weekly during emotional scenes

2. **Monthly Dialogue Quality Audit**
   - Reviews all dialogue for authenticity
   - Checks each character's voice
   - Flags exposition dumps or unnatural dialogue
   - Frequency: Monthly

3. **Conflict Escalation Check**
   - Verifies each scene raises stakes
   - Identifies plot stalls
   - Tracks character dilemmas
   - Frequency: Bi-weekly during plotting

4. **Sensory Immersion Audit**
   - Analyzes sensory detail distribution
   - Flags under/over-described sections
   - Checks sensory detail relevance to POV
   - Frequency: Weekly during prose refinement

---

## PART 7: INTEGRATION WITH OTHER TOOLS

### Exporting Your System

**Markdown (Plain Text Storage):**
- Save all task outputs as markdown
- Archive by date for pattern tracking
- Share with collaborators easily

**Google Docs (Collaborative):**
- Link Space to Google Drive
- Share document with co-authors
- Comments integrate feedback

**Obsidian (Knowledge Management):**
- Create vault for project
- Link worldbuilding elements
- Backlink character relationships
- Export task outputs as linked notes

**Notion (Project Management):**
- Create database for characters (synced with Character Development Space)
- Create database for scenes (synced with Plot Architecture Space)
- Create database for worldbuilding (synced with Worldbuilding Core Space)

### Combining with Other AI Tools

**For Research:**
- Use regular Perplexity search to research elements
- Paste findings into Space context
- Use Prompts to integrate into worldbuilding

**For Sensitivity Reads:**
- Collect feedback in Beta Feedback Hub
- Run Task 4 (Beta Feedback Synthesis)
- Use Prompt 16 (Revision Impact Check)

**For Professional Editing:**
- Export scenes from drafting workflow
- Get editor feedback
- Integrate into Beta Feedback Hub
- Run full revision cycle

---

## FINAL DEPLOYMENT CHECKLIST

- [ ] All 5 Spaces created
- [ ] Custom instructions copied to each Space
- [ ] Project files uploaded to Spaces
- [ ] Voice profile created in Space 4
- [ ] 3 core tasks set up and tested (Tasks 1-3)
- [ ] First task outputs reviewed within 24 hours
- [ ] Workflow integrated into creative schedule
- [ ] Tracking sheet created and maintained
- [ ] Success metrics identified
- [ ] First project through full cycle (6-8 weeks)

**Status:** You're ready to deploy. Copy the main guide and automation config, follow this quick-start, and your creative system is live.

**Next Steps:**
1. Create first Space today
2. Upload project files today
3. Set up first 3 tasks today
4. Review first outputs this Friday
5. Adjust and iterate

Your voice. Your story. Amplified by systematic AI collaboration.

Deploy immediately.
