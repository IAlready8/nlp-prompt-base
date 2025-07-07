
You are claudecode a super intelligent software engineer with almost 15 years of experience (damn I'm old) and wanted to share some incredibly useful patterns I've implemented that I haven't seen anyone else talking about. The particular **context** here is that I am developing a rather large project with Claude Code and have been kind of hacking my way around some of the ingrained limitations of the tool. Would love to hear what other peoples hacks are! 

#### **Define a clear documentation structure and repository structure in** [`CLAUDE.md`](http://CLAUDE.md)

This will help out a lot especially if you are doing something like planning a startup where it's not just technical stuff there are tons of considerations to keep track of. These documents are crucial to help Claude make the best use of it's context, as well as provide shortcuts to understanding decisions we've already made. 

    ### Documentation Structure
    
    The documentation follows a structured, numbered system. For a full index, see `docs/README.md`.
    
    - `docs/00-Foundations/`: Core mission, vision, and values
    - `docs/01-Strategy/`: Business model, market analysis, and competitive landscape
    - `docs/02-Product/`: Product requirements, CLI specifications, and MVP scope
    - `docs/03-Go-To-Market/`: User experience, launch plans, and open-core strategy
    - `docs/04-Execution/`: Execution strategy, roadmaps, and system architecture
    - `docs/04-Execution/06-Sprint-Grooming-Process.md`: Detailed process for sprint planning and epic grooming.

#### **Break your project into multiple repos and add them to** [**CLAUDE.md**](http://CLAUDE.md)

This is pretty basic but breaking a large project into multiple repos can really help especially with LLMs since we want to keep the literal content of everything to a minimum. It provides natural  boundaries that contain broad chunks of the system, preventing Claude from reading that information into it's context window unless it's necessary.

    ## 📁 Repository Structure
    
    ### Open Source Repositories (MIT License)
    - `<app>-cli`: Complete CLI interface and API client
    - `<app>-core`: Core engine, graph operations, REST API
    - `<app>-schemas`: Graph schemas and data models
    - `<app>-docs`: Community documentation

#### **Create a slash command as a shortcut to planning process in** `.claude/plan.md`

This allows you to run `/plan` and claude will automatically pick up your agile sprint planning right where you left off. 

    # AI Assistant Sprint Planning Command
    
    This document contains the prompt to be used with an AI Assistant (e.g., Claude Code's slash command) to initiate and manage the sprint planning and grooming process.
    
    ---
    
    **AI Assistant Directive:**
    
    You are tasked with guiding the Product Owner through the sprint planning and grooming process for the current development sprint.
    
    **Follow these steps:**
    
    1.  **Identify Current Sprint**: Read the `Current Sprint` value from `/CLAUDE.md`. This is the target sprint for grooming.
    2.  **Review Process**: Refer to `/docs/04-Execution/06-Sprint-Grooming-Process.md` for the detailed steps of "Epic Grooming (Iterative Discussion)".
    3.  **Determine Grooming Needs**:
        *   List all epic markdown files within the `/sprints/<Current Sprint>/` directory.
        *   For each epic, check its `Status` field and the completeness of its `User Stories` and `Tasks` sections. An epic needs grooming if its `Status` is `Not Started` or `In Progress` and its `Tasks` section is not yet detailed with estimates, dependencies, and acceptance criteria as per the `Epic Document Structure (Example)` in the grooming process document.
    4.  **Initiate Grooming**:
        *   If there are epics identified in Step 3 that require grooming, select the next one.
        *   Begin an interactive grooming session with the Product Owner. Your primary role is to ask clarifying questions (as exemplified in Section 2 of the grooming process document) to:
            *   Ensure the epic's relevance to the MVP.
            *   Clarify its scope and identify edge cases.
            *   Build a shared technical understanding.
            *   Facilitate the breakdown of user stories into granular tasks, including `Estimate`, `Dependencies`, `Acceptance Criteria`, and `Notes`.
        *   **Propose direct updates to the epic's markdown file** (`/sprints/<Current Sprint>/<epic_name>.md`) to capture all discussed details.
        *   Continue this iterative discussion until the Product Owner confirms the epic is fully groomed and ready for development.
        *   Once an epic is fully groomed, update its `Status` field in the markdown file.
    5.  **Sprint Completion Check**:
        *   If all epics in the current sprint directory (`/sprints/<Current Sprint>/`) have been fully groomed (i.e., their `Status` is updated and tasks are detailed), inform the Product Owner that the sprint is ready for kickoff.
        *   Ask the Product Owner if they would like to proceed with setting up the development environment (referencing Sprint 1 tasks) or move to planning the next sprint.

This basically lets you do agile development with Claude. It's amazing because it really helps to keep Claude focused. It also makes the communication flow less dependent on me. Claude is really good at identifying the high level tasks, but falls apart if you try and go right into the implementation without hashing out the details. The sprint process allows you sort of break down the problem into neat little bite-size chunks. 

The referenced grooming process provides a reusable process for kind of iterating through the problem and making all of the considerations, all while getting feedback from me. The benefits of this are really powerful:

1. It avoids a lot of the context problems with high-complexity projects because all of the relevant information is captured in in your sprint planning docs. A completely clean context window can quickly understand where we are at and resume right where we left off.

2. It encourages Claude to dive MUCH deeper into problem solving without me having to do a lot of the high level brainstorming to figure out the right questions to get Claude moving in the right direction. 

3. It prevents Claude from going and making these large sweeping decisions without running it by me first. The grooming process allows us to discover all of those key decisions that need to be made BEFORE we start coding.

For reference here is [`06-Sprint-Grooming-Process.md`](http://06-Sprint-Grooming-Process.md)

    # Sprint Planning and Grooming Process
    
    This document defines the process for planning and grooming our development sprints. The goal is to ensure that all planned work is relevant, well-understood, and broken down into actionable tasks, fostering a shared technical understanding before development begins.
    
    ---
    
    ## 1. Sprint Planning Meeting
    
    **Objective**: Define the overall goals and scope for the upcoming sprint.
    
    **Participants**: Product Owner (you), Engineering Lead (you), AI Assistant (me)
    
    **Process**:
    1.  **Review High-Level Roadmap**: Discuss the strategic priorities from `ACTION-PLAN.md` and `docs/04-Execution/02-Product-Roadmap.md`.
    2.  **Select Epics**: Identify the epics from the product backlog that align with the sprint's goals and fit within the estimated sprint capacity.
    3.  **Define Sprint Goal**: Articulate a clear, concise goal for the sprint.
    4.  **Create Sprint Folder**: Create a new directory `sprints/<sprint_number>/` (e.g., `sprints/2/`).
    5.  **Create Epic Files**: For each selected epic, create a new markdown file `sprints/<sprint_number>/<epic_name>.md`.
    6.  **Initial Epic Population**: Populate each epic file with its `Description` and initial `User Stories` (if known).
    
    ---
    
    ## 2. Epic Grooming (Iterative Discussion)
    
    **Objective**: Break down each epic into detailed, actionable tasks, ensure relevance, and establish a shared technical understanding. This is an iterative process involving discussion and refinement.
    
    **Participants**: Product Owner (you), AI Assistant (me)
    
    **Process**:
    For each epic in the current sprint:
    1.  **Product Owner Review**: You, as the Product Owner, review the epic's `Description` and `User Stories`.
    2.  **AI Assistant Questioning**: I will ask a series of clarifying questions to:
        *   **Ensure Relevance**: Confirm the epic's alignment with sprint goals and overall MVP.
        *   **Clarify Scope**: Pinpoint what's in and out of scope.
        *   **Build Technical Baseline**: Uncover potential technical challenges, dependencies, and design considerations.
        *   **Identify Edge Cases**: Prompt thinking about unusual scenarios or error conditions.
    
        **Example Questions I might ask**:
        *   **Relevance/Value**: "How does this epic directly contribute to our current MVP success metrics (e.g., IAM Hell Visualizer, core dependency mapping)? What specific user pain does it alleviate?"
        *   **User Stories**: "Are these user stories truly from the user's perspective? Do they capture the 'why' behind the 'what'? Can we add acceptance criteria to each story?"
        *   **Technical Deep Dive**: "What are the primary technical challenges you foresee in implementing this? Are there any external services or APIs we'll need to integrate with? What are the potential performance implications?"
        *   **Dependencies**: "Does this epic depend on any other epics in this sprint or future sprints? Are there any external teams or resources we'll need?"
        *   **Edge Cases/Error Handling**: "What happens if [X unexpected scenario] occurs? How should the system behave? What kind of error messages should the user see?"
        *   **Data Model Impact**: "How will this epic impact our Neo4j data model? Are there new node types, relationship types, or properties required?"
        *   **Testing Strategy**: "What specific types of tests (unit, integration, end-to-end) will be critical for this epic? Are there any complex scenarios that will be difficult to test?"
    
    3.  **Task Breakdown**: Based on our discussion, we will break down each `User Story` into granular `Tasks`. Each task should be:
        *   **Actionable**: Clearly define what needs to be done.
        *   **Estimable**: Small enough to provide a reasonable time estimate.
        *   **Testable**: Have clear acceptance criteria.
    
    4.  **Low-Level Details**: For each `Task`, we will include:
        *   `Estimate`: Time required (e.g., in hours).
        *   `Dependencies`: Any other tasks or external factors it relies on.
        *   `Acceptance Criteria`: How we know the task is complete and correct.
        *   `Notes`: Any technical considerations, design choices, or open questions.
    
    5.  **Document Update**: The epic markdown file (`sprints/<sprint_number>/<epic_name>.md`) is updated directly during or immediately after the grooming session.
    
    ---
    
    ## 3. Sprint Kickoff
    
    **Objective**: Ensure the entire development team understands the sprint goals and the details of each epic, and commits to the work.
    
    **Participants**: Product Owner, Engineering Lead, Development Team
    
    **Process**:
    1.  **Review Sprint Goal**: Reiterate the sprint's overall objective.
    2.  **Epic Presentations**: Each Epic Owner (or you, initially) briefly presents their groomed epic, highlighting:
        *   The `Description` and `User Stories`.
        *   Key `Tasks` and their `Acceptance Criteria`.
        *   Any significant `Dependencies` or technical considerations.
    3.  **Q&A**: The team asks clarifying questions to ensure a shared understanding.
    4.  **Commitment**: The team commits to delivering the work in the sprint.
    5.  **Task Assignment**: Tasks are assigned to individual developers or pairs.
    
    ---
    
    ## Epic Document Structure (Example)
    
    ```markdown
    # Epic: <Epic Title>
    
    **Sprint**: <Sprint Number>
    **Status**: Not Started | In Progress | Done
    **Owner**: <Developer Name(s)>
    
    ---
    
    ## Description
    
    <A detailed description of the epic and its purpose.>
    
    ## User Stories
    
    - [ ] **Story 1:** <User story description>
        - **Tasks:**
            - [ ] <Task 1 description> (Estimate: <time>, Dependencies: <list>, Acceptance Criteria: <criteria>, Notes: <notes>)
            - [ ] <Task 2 description> (Estimate: <time>, Dependencies: <list>, Acceptance Criteria: <criteria>, Notes: <notes>)
            - ...
    - [ ] **Story 2:** <User story description>
        - **Tasks:**
            - [ ] <Task 1 description> (Estimate: <time>, Dependencies: <list>, Acceptance Criteria: <criteria>, Notes: <notes>)
            - ...
    
    ## Dependencies
    
    - <List any dependencies on other epics or external factors>
    
    ## Acceptance Criteria (Overall Epic)
    
    - <List the overall criteria that must be met for the epic to be considered complete>
    ```

And the last thing that's been helpful is to use ADRs to keep track of architectural decisions that you make. You can put this into `CLAUDE.md` and it will  create documents for any important architectural decisions

    ### Architectural Decision Records (ADRs)
    Technical decisions are documented in `docs/ADRs/`. Key architectural decisions:
    - **ADR-001**: Example ADR
    
    **AI Assistant Directive**: When discussing architecture or making technical decisions, always reference relevant ADRs. If a new architectural decision is made during development, create or update an ADR to document it. This ensures all technical decisions have clear rationale and can be revisited if needed.

All I can say is that I am blown away at how incredible these models once you figure out how to work with them effectively. Almost every helpful pattern I've found basically comes down to just treating AI like it's a person or to tell it to leverage the same systems (e.g., use agile sprints) that humans do. 

Make hay folks, don't sleep on this technology. So many engineers are clueless. Those who leverage this technology will be travel into the future at light speed compared to everyone else. 

Live long and prosper.