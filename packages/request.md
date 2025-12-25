===== OPENAI STREAMING START ===== [2025-12-22T11:27:37.224Z] Request:
{"model":"doubao-seed-1-8-251215","messages":[{"role":"user","content":"This is
the Qflow CLI. We are setting up the context for our chat.\nToday's date is
2025年12月22日星期一 (formatted according to the user's locale).\nMy operating
system is: darwin\nThe project's temporary directory is:
/Users/mac/.qflow/tmp/76d6c4d835b30d6ca4b6e3869169047bc8a88add6c0065b4f358a9f4a28e5388\nI'm
currently working in the directory: /Volumes/lp/code/gemini-cli\nHere is the
folder structure of the current working directories:\n\nShowing up to 200 items
(files + folders). Folders or files indicated with ... contain more items not
shown, were ignored, or the display limit (200 items) was
reached.\n\n/Volumes/lp/code/gemini-cli/\n├───.editorconfig\n├───.env.example\n├───.gitattributes\n├───.gitignore\n├───.lycheeignore\n├───.npmrc\n├───.nvmrc\n├───.prettierignore\n├───.prettierrc.json\n├───.yamllint.yml\n├───CONTRIBUTING.md\n├───cwdhf-qflow-cli-0.21.1-nightly.20251213.977248e09.tgz\n├───Dockerfile\n├───esbuild.config.js\n├───eslint.config.js\n├───QFLOW.md\n├───LICENSE\n├───Makefile\n├───OPENAI_USAGE.md\n├───package-lock.json\n├───package.json\n├───README.md\n├───ROADMAP.md\n├───SECURITY.md\n├───silent-mode-docs.md\n├───test_openai_fix.md\n├───tsconfig.json\n├───using.md\n├───.allstar/\n│
└───branch_protection.yaml\n├───.gcp/\n│ ├───Dockerfile.gemini-code-builder\n│
└───release-docker.yml\n├───.qflow/\n│ ├───config.yaml\n│
└───commands/...\n├───.git/...\n├───.github/\n│ ├───CODEOWNERS\n│
├───dependabot.yml\n│ ├───pull_request_template.md\n│ ├───actions/\n│ │
├───calculate-vars/\n│ │ ├───create-pull-request/\n│ │ ├───npm-auth-token/\n│ │
├───post-coverage-comment/\n│ │ ├───publish-release/\n│ │ ├───push-docker/\n│ │
├───push-sandbox/\n│ │ ├───run-tests/\n│ │ ├───setup-npmrc/\n│ │
├───tag-npm-release/\n│ │ └───verify-release/\n│ ├───ISSUE_TEMPLATE/\n│ │
├───bug_report.yml\n│ │ ├───feature_request.yml\n│ │ └───website_issue.yml\n│
├───scripts/\n│ │ └───pr-triage.sh\n│ └───workflows/\n│ ├───chained_e2e.yml\n│
├───ci.yml\n│ ├───community-report.yml\n│ ├───deflake.yml\n│
├───docs-page-action.yml\n│ ├───docs-rebuild.yml\n│ ├───eval.yml\n│
├───gemini-automated-issue-dedup.yml\n│ └───gemini-automated-issue-triage.yml\n│
└───...\n├───.husky/\n│ ├───pre-commit\n│ └───_/\n├───.vscode/\n│
├───extensions.json\n│ ├───launch.json\n│ ├───settings.json\n│
└───tasks.json\n├───bundle/...\n├───docs/\n│ ├───architecture.md\n│
├───faq.md\n│ ├───index.md\n│ ├───integration-tests.md\n│
├───issue-and-pr-automation.md\n│ ├───local-development.md\n│ ├───npm.md\n│
├───quota-and-pricing.md\n│ ├───release-confidence.md\n│ ├───releases.md\n│
├───sidebar.json\n│ ├───tos-privacy.md\n│ ├───troubleshooting.md\n│
├───assets/\n│ ├───changelogs/\n│ ├───cli/\n│ ├───core/\n│ ├───examples/\n│
├───extensions/\n│ ├───get-started/\n│ ├───hooks/\n│ ├───ide-integration/\n│
├───mermaid/\n│ └───tools/\n├───integration-tests/\n│
├───context-compress-interactive.compress-empty.responses\n│
├───context-compress-interactive.compress-failure.responses\n│
├───context-compress-interactive.compress.responses\n│
├───context-compress-interactive.test.ts\n│ ├───ctrl-c-exit.test.ts\n│
├───extensions-install.test.ts\n│ ├───extensions-reload.test.ts\n│
├───file-system-interactive.test.ts\n│ ├───file-system.test.ts\n│
├───flicker-detector.max-height.responses\n│ ├───flicker.test.ts\n│
├───globalSetup.ts\n│ ├───google_web_search.test.ts\n│
├───hooks-system.after-model.responses\n│
├───hooks-system.after-tool-context.responses\n│
├───hooks-system.allow-tool.responses\n│
├───hooks-system.before-agent.responses\n│
├───hooks-system.before-model.responses\n│
├───hooks-system.before-tool-selection.responses\n│
├───hooks-system.block-tool.responses\n│
├───hooks-system.compress-auto.responses\n│
├───hooks-system.disabled-via-command.responses\n│
├───hooks-system.disabled-via-settings.responses\n│
├───hooks-system.error-handling.responses\n│
├───hooks-system.input-validation.responses\n│
├───hooks-system.multiple-events.responses\n│
├───hooks-system.notification.responses\n│
├───hooks-system.sequential-execution.responses\n│
├───hooks-system.session-clear.responses\n│
├───hooks-system.session-startup.responses\n│
├───hooks-system.telemetry.responses\n│ ├───hooks-system.test.ts\n│
├───json-output.error.responses\n│ ├───json-output.test.ts\n│
├───list_directory.test.ts\n│ ├───mcp_server_cyclic_schema.test.ts\n│
├───mixed-input-crash.test.ts\n│ ├───read_many_files.test.ts\n│
├───replace.test.ts\n│ ├───ripgrep-real.test.ts\n│
├───run_shell_command.test.ts\n│ ├───save_memory.test.ts\n│
├───simple-mcp-server.test.ts\n│ ├───stdin-context.test.ts\n│
├───telemetry.test.ts\n│ ├───test-helper.ts\n│ ├───test-mcp-server.ts\n│
├───tsconfig.json\n│ ├───utf-bom-encoding.test.ts\n│ ├───vitest.config.ts\n│
└───write_file.test.ts\n├───node_modules/...\n├───packages/\n│
├───a2a-server/\n│ ├───cli/\n│ ├───core/\n│ ├───test-utils/\n│
└───vscode-ide-companion/\n├───schemas/\n│
└───settings.schema.json\n├───scripts/\n│ ├───build_package.js\n│
├───build_sandbox.js\n│ ├───build_vscode_companion.js\n│ ├───build.js\n│
├───check-build-status.js\n│ ├───check-lockfile.js\n│ ├───clean.js\n│
├───copy_bundle_assets.js\n│ ├───copy_files.js\n│ ├───create_alias.sh\n│
├───deflake.js\n│ ├───generate-git-commit-info.js\n│
├───generate-keybindings-doc.ts\n│ ├───generate-settings-doc.ts\n│
├───generate-settings-schema.ts\n│ ├───get-release-version.js\n│ ├───lint.js\n│
├───local_telemetry.js\n│ ├───pre-commit.js\n│ ├───prepare-github-release.js\n│
├───prepare-package.js\n│ ├───sandbox_command.js\n│ ├───start.js\n│
├───telemetry_gcp.js\n│ ├───telemetry_genkit.js\n│ ├───telemetry_utils.js\n│
├───telemetry.js\n│ ├───test-windows-paths.js\n│ ├───version.js\n│
├───releasing/\n│ ├───tests/\n│ └───utils/\n├───third_party/\n│
└───get-ripgrep/\n└───types/\n\nReminder: Do not return an empty response when a
tool call is required.\n\nMy setup is complete. I will provide my first command
in the next
turn."},{"role":"user","content":"1+1=?"},{"role":"user","content":"System:
Please
continue."}],"temperature":1,"top_p":0.95,"stream":true,"tools":[{"type":"function","function":{"name":"list_directory","description":"Lists
the names of files and subdirectories directly within a specified directory
path. Can optionally ignore entries matching provided glob
patterns.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"read_file","description":"Reads
and returns the content of a specified file. If the file is large, the content
will be truncated. The tool's response will clearly indicate if truncation has
occurred and will provide details on how to read more of the file using the
'offset' and 'limit' parameters. Handles text, images (PNG, JPG, GIF, WEBP, SVG,
BMP), audio files (MP3, WAV, AIFF, AAC, OGG, FLAC), and PDF files. For text
files, it can read specific line
ranges.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"search_file_content","description":"FAST,
optimized search powered by `ripgrep`. PREFERRED over standard
`run_shell_command(\"grep ...\")` due to better performance and automatic output
limiting (max 20k
matches).","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"glob","description":"Efficiently
finds files matching specific glob patterns (e.g., `src/**/*.ts`, `**/*.md`),
returning absolute paths sorted by modification time (newest first). Ideal for
quickly locating files based on their name or path structure, especially in
large
codebases.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"replace","description":"Replaces
text within a file. By default, replaces a single occurrence, but can replace
multiple occurrences when `expected_replacements` is specified. This tool
requires providing significant context around the change to ensure precise
targeting. Always use the read_file tool to examine the file's current content
before attempting a text replacement.\n \n The user has the ability to modify
the `new_string` content. If modified, this will be stated in the response.\n \n
Expectation for required parameters:\n 1. `old_string` MUST be the exact literal
text to replace (including all whitespace, indentation, newlines, and
surrounding code etc.).\n 2. `new_string` MUST be the exact literal text to
replace `old_string` with (also including all whitespace, indentation, newlines,
and surrounding code etc.). Ensure the resulting code is correct and idiomatic
and that `old_string` and `new_string` are different.\n 3. `instruction` is the
detailed instruction of what needs to be changed. It is important to Make it
specific and detailed so developers or large language models can understand what
needs to be changed and perform the changes on their own if necessary. \n 4.
NEVER escape `old_string` or `new_string`, that would break the exact literal
text requirement.\n **Important:** If ANY of the above are not satisfied, the
tool will fail. CRITICAL for `old_string`: Must uniquely identify the single
instance to change. Include at least 3 lines of context BEFORE and AFTER the
target text, matching whitespace and indentation precisely. If this string
matches multiple locations, or does not match exactly, the tool will fail.\n 5.
Prefer to break down complex and long changes into multiple smaller atomic calls
to this tool. Always check the content of the file after changes or not finding
a string to match.\n **Multiple replacements:** Set `expected_replacements` to
the number of occurrences you want to replace. The tool will replace ALL
occurrences that match `old_string` exactly. Ensure the number of replacements
matches your
expectation.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"write_file","description":"Writes
content to a specified file in the local filesystem.\n\n The user has the
ability to modify `content`. If modified, this will be stated in the
response.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"web_fetch","description":"Processes
content from URL(s), including local and private network addresses (e.g.,
localhost), embedded in a prompt. Include up to 20 URLs and instructions (e.g.,
summarize, extract specific data) directly in the 'prompt'
parameter.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"run_shell_command","description":"This
tool executes a given shell command as `bash -c <command>`. Command can start
background processes using `&`. Command is executed as a subprocess that leads
its own process group. Command process group can be terminated as
`kill -- -PGID` or signaled as `kill -s SIGNAL -- -PGID`.\n\n The following
information is returned:\n\n Command: Executed command.\n Directory: Directory
where command was executed, or `(root)`.\n Stdout: Output on stdout stream. Can
be `(empty)` or partial on error and for any unwaited background processes.\n
Stderr: Output on stderr stream. Can be `(empty)` or partial on error and for
any unwaited background processes.\n Error: Error or `(none)` if no error was
reported for the subprocess.\n Exit Code: Exit code or `(none)` if terminated by
signal.\n Signal: Signal number or `(none)` if no signal was received.\n
Background PIDs: List of background processes started or `(none)`.\n Process
Group PGID: Process group started or
`(none)`","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"save_memory","description":"\nSaves
a specific piece of information or fact to your long-term memory.\n\nUse this
tool:\n\n- When the user explicitly asks you to remember something (e.g.,
\"Remember that I like pineapple on pizza\", \"Please save this: my cat's name
is Whiskers\").\n- When the user states a clear, concise fact about themselves,
their preferences, or their environment that seems important for you to retain
for future interactions to provide a more personalized and effective
assistance.\n\nDo NOT use this tool:\n\n- To remember conversational context
that is only relevant for the current session.\n- To save long, complex, or
rambling pieces of text. The fact should be relatively short and to the
point.\n- If you are unsure whether the information is a fact worth remembering
long-term. If in doubt, you can ask the user, \"Should I remember that for
you?\"\n\n## Parameters\n\n- `fact` (string, required): The specific fact or
piece of information to remember. This should be a clear, self-contained
statement. For example, if the user says \"My favorite color is blue\", the fact
would be \"My favorite color is
blue\".","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"google_web_search","description":"Performs
a web search using Google Search (via the Gemini API) and returns the results.
This tool is useful for finding information on the internet based on a
query.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"write_todos","description":"This
tool can help you list out the current subtasks that are required to be
completed for a given user request. The list of subtasks helps you keep track of
the current task, organize complex queries and help ensure that you don't miss
any steps. With this list, the user can also see the current progress you are
making in executing a given task.\n\nDepending on the task complexity, you
should first divide a given task into subtasks and then use this tool to list
out the subtasks that are required to be completed for a given user
request.\nEach of the subtasks should be clear and distinct. \n\nUse this tool
for complex queries that require multiple steps. If you find that the request is
actually complex after you have started executing the user task, create a todo
list and use it. If execution of the user task requires multiple steps, planning
and generally is higher complexity than a simple Q&A, use this tool.\n\nDO NOT
use this tool for simple tasks that can be completed in less than 2 steps. If
the user query is simple and straightforward, do not use the tool. If you can
respond with an answer in a single turn then this tool is not required.\n\n##
Task state definitions\n\n- pending: Work has not begun on a given subtask.\n-
in_progress: Marked just prior to beginning work on a given subtask. You should
only have one subtask as in_progress at a time.\n- completed: Subtask was
successfully completed with no errors or issues. If the subtask required more
steps to complete, update the todo list with the subtasks. All steps should be
identified as completed only when they are completed.\n- cancelled: As you
update the todo list, some tasks are not required anymore due to the dynamic
nature of the task. In this case, mark the subtasks as cancelled.\n\n\n##
Methodology for using this tool\n1. Use this todo list as soon as you receive a
user request based on the complexity of the task.\n2. Keep track of every
subtask that you update the list with.\n3. Mark a subtask as in_progress before
you begin working on it. You should only have one subtask as in_progress at a
time.\n4. Update the subtask list as you proceed in executing the task. The
subtask list is not static and should reflect your progress and current plans,
which may evolve as you acquire new information.\n5. Mark a subtask as completed
when you have completed it.\n6. Mark a subtask as cancelled if the subtask is no
longer needed.\n7. You must update the todo list as soon as you start, stop or
cancel a subtask. Don't batch or wait to update the todo list.\n\n\n## Examples
of When to Use the Todo List\n\n<example>\nUser request: Create a website with a
React for creating fancy logos using gemini-2.5-flash-image\n\nToDo list created
by the agent:\n1. Initialize a new React project environment (e.g., using
Vite).\n2. Design and build the core UI components: a text input (prompt field)
for the logo description, selection controls for style parameters (if the API
supports them), and an image preview area.\n3. Implement state management (e.g.,
React Context or Zustand) to manage the user's input prompt, the API loading
status (pending, success, error), and the resulting image data.\n4. Create an
API service module within the React app (using \"fetch\" or \"axios\") to
securely format and send the prompt data via an HTTP POST request to the
specified \"gemini-2.5-flash-image\" (Qflow model) endpoint.\n5. Implement
asynchronous logic to handle the API call: show a loading indicator while the
request is pending, retrieve the generated image (e.g., as a URL or base64
string) upon success, and display any errors.\n6. Display the returned \"fancy
logo\" from the API response in the preview area component.\n7. Add
functionality (e.g., a \"Download\" button) to allow the user to save the
generated image file.\n8. Deploy the application to a web server or hosting
platform.\n\n<reasoning>\nThe agent used the todo list to break the task into
distinct, manageable steps:\n1. Building an entire interactive web application
from scratch is a highly complex, multi-stage process involving setup, UI
development, logic integration, and deployment.\n2. The agent inferred the core
functionality required for a \"logo creator,\" such as UI controls for
customization (Task 3) and an export feature (Task 7), which must be tracked as
distinct goals.\n3. The agent rightly inferred the requirement of an API service
model for interacting with the image model
endpoint.\n</reasoning>\n</example>\n\n\n## Examples of When NOT to Use the Todo
List\n\n<example>\nUser request: Ensure that the test <test file>
passes.\n\nAgent:\n<Goes into a loop of running the test, identifying errors,
and updating the code until the test passes.>\n\n<reasoning>\nThe agent did not
use the todo list because this task could be completed by a tight loop of
execute test->edit->execute
test.\n</reasoning>\n</example>\n","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"read_todos","description":"This
tool allows you to read and query the current todo list. You can filter todos by
status or
ID.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"delegate_to_agent","description":"Delegates
a task to a specialized sub-agent.\n\nAvailable agents:\n-
**codebase_investigator**: The specialized tool for codebase analysis,
architectural mapping, and understanding system-wide dependencies.\n Invoke this
tool for tasks like vague requests, bug root-cause analysis, system refactoring,
comprehensive feature implementation or to answer questions about the codebase
that require investigation.\n It returns a structured report with key file
paths, symbols, and actionable architectural
insights.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_branch","description":"[Code
Management] Create a new branch in a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_branch","description":"[Code
Management] Get information about a branch in a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"delete_branch","description":"[Code
Management] Delete a branch from a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_branches","description":"[Code
Management] List branches in a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_file_blobs","description":"[Code
Management] Get file content from a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_file","description":"[Code
Management] Create a new file in a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"update_file","description":"[Code
Management] Update an existing file in a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"delete_file","description":"[Code
Management] Delete a file from a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_files","description":"[Code
Management] List file tree from a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"compare","description":"[Code
Management] Query code to compare
content","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_repository","description":"[Code
Management] Get information about a Codeup
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_repositories","description":"[Code
Management] Get the CodeUp Repository List.\n\nA Repository serves as a unit for
managing source code and is distinct from a Project.\n\nUse Case:\n\nView my
repositories","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_change_request","description":"[Code
Management] Get information about a change
request","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_change_requests","description":"[Code
Management] List change
requests","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_change_request","description":"[Code
Management] Create a new change
request","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_change_request_comment","description":"[Code
Management] Create a comment on a change
request","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_change_request_comments","description":"[Code
Management] List comments on a change
request","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_change_request_patch_sets","description":"[Code
Management] List patch sets for a change
request","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_current_organization_info","description":"Get
information about the current user and organization based on the token. In the
absence of an explicitly specified organization ID, this result will take
precedence.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_user_organizations","description":"Get
the list of organizations the current user belongs
to","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_current_user","description":"Get
information about the current user based on the token. In the absence of an
explicitly specified user ID, this result will take
precedence.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_organization_departments","description":"Get
the list of departments in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_organization_department_info","description":"Get
information about a department in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_organization_department_ancestors","description":"Get
the ancestors of a department in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_organization_members","description":"list
user members in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_organization_member_info","description":"Get
information about a member in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_organization_member_info_by_user_id","description":"Get
information about a member in an organization by user
ID","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"search_organization_members","description":"[Organization
Management] Search for organization
members","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_organization_roles","description":"[Organization
Management] List organization
roles","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_organization_role","description":"[Organization
Management] Get information about an organization
role","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_project","description":"[Project
Management] Get information about a Yunxiao
project","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"search_projects","description":"[Project
Management] Search for Yunxiao Project List. A Project is a project management
unit that includes work items and sprints, and it is different from a code
repository (Repository).\n\nUse Cases:\n\nQuery projects I am involved in\nQuery
projects I have
created","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_work_item","description":"[Project
Management] Get information about a work
item","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_work_item","description":"[Project
Management] Create a work
item","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"search_workitems","description":"[Project
Management] Search work items with various filter
conditions","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_work_item_types","description":"[Project
Management] Get the list of work item types for a
project","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_pipeline","description":"[Pipeline
Management] Get details of a specific pipeline in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_pipelines","description":"[Pipeline
Management] Get a list of pipelines in an organization with filtering
options","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"generate_pipeline_yaml","description":"[Pipeline
Management] Generate only the YAML configuration for a pipeline without creating
it.\n\n**📋 Use Cases:**\n- Preview YAML before creating pipeline\n- Generate
YAML for manual deployment\n- Debug pipeline configuration\n\n**📖 Recommended
Workflow:**\n1. 🎯 Parse user description for explicit parameters\n2. 🔍 If
missing context, prefer IDE detection (terminal + file reading) over API
calls\n3. 🚀 Call this tool with collected parameters\n\n**💡 Parameter
Collection Strategy:**\n- For QUICK pipeline creation: Use IDE detection (git
config, file reading)\n- For PRECISE parameter selection: Consider
list_repositories, list_service_connections when needed\n- Balance efficiency
vs. accuracy based on user intent\n\n**⚡ Built-in capabilities:** Handles
default service connections internally, auto-extracts project name from repo
URL","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_pipeline_from_description","description":"[Pipeline
Management] Create a pipeline using structured parameters extracted from user
descriptions and environment context.\n\n**🔧 Built-in Capabilities:**\n- ✅
Automatically retrieves default service connection IDs when not specified\n- ✅
Handles repository and service connection logic internally\n- ✅ Auto-extracts
project name from repository URL (git@host:org/repo.git → repo)\n- ✅ Supports
both IDE detection and explicit parameter specification\n\n**📖 Recommended
Workflow:**\n1. 🎯 PARSE user description for explicit parameters\n2. 🔍 DETECT
missing info from IDE environment FIRST:\n - Run
`git config --get remote.origin.url` → repoUrl\n - Run
`git branch --show-current` → branch\n - Auto-extract serviceName from
repoUrl\n - Check project files for tech stack:\n _ pom.xml →
buildLanguage='java', buildTool='maven'\n _ build.gradle → buildLanguage='java',
buildTool='gradle'\n _ package.json + package-lock.json →
buildLanguage='nodejs', buildTool='npm'\n _ package.json + yarn.lock →
buildLanguage='nodejs', buildTool='yarn'\n _ requirements.txt →
buildLanguage='python', buildTool='pip'\n _ go.mod → buildLanguage='go',
buildTool='go'\n \* _.csproj → buildLanguage='dotnet', buildTool='dotnet'\n3. 🚀
CALL this tool with collected parameters\n\n**⚠️ Important Guidelines:**\n- DO
NOT call list_repositories unless user explicitly asks to choose from available
repositories\n- DO NOT call list_service_connections unless user explicitly asks
to choose from available connections\n- ALWAYS try IDE detection first before
making any API calls\n- If IDE detection fails, THEN consider API calls as
fallback\n\n**🎯 Parameter Priority:**\n1. 👤 USER EXPLICIT (highest) -
buildLanguage, buildTool, versions, deployTarget\n2. 🔍 IDE DETECTION
(preferred) - repoUrl, branch, serviceName, tech stack\n3. 🤖 TOOL DEFAULTS
(automatic) - serviceConnectionId, organizationId\n\n**🔍 IDE Detection Rules
(MUST TRY FIRST):**\n- 📂 Repository: `git config --get remote.origin.url` →
repoUrl\n- 🌿 Branch: `git branch --show-current` → branch\n- 🏷️ Service Name:
Auto-extracted from repoUrl (git@host:org/repo.git → repo)\n- ☕ Java Maven:
pom.xml exists → buildLanguage='java', buildTool='maven'\n- 🏗️ Java Gradle:
build.gradle exists → buildLanguage='java', buildTool='gradle'\n- 🟢 Node npm:
package.json + package-lock.json → buildLanguage='nodejs', buildTool='npm'\n- 🧶
Node yarn: package.json + yarn.lock → buildLanguage='nodejs',
buildTool='yarn'\n- 🐍 Python: requirements.txt → buildLanguage='python',
buildTool='pip'\n- 🐹 Go: go.mod → buildLanguage='go', buildTool='go'\n- 💙
.NET: _.csproj → buildLanguage='dotnet', buildTool='dotnet'\n\n**📝 Version
Detection (from project files):**\n- ☕ JDK: Read pom.xml
<maven.compiler.source> → jdkVersion\n- 🟢 Node: Read package.json engines.node
→ nodeVersion\n- 🐍 Python: Read .python-version, pyproject.toml →
pythonVersion\n- 🐹 Go: Read go.mod go directive → goVersion\n\n**🎯 Deployment
Parsing:**\n- '部署到主机/VM/虚拟机' → deployTarget='vm'\n-
'部署到Kubernetes/K8s' → deployTarget='k8s'\n- '只构建/构建制品' →
deployTarget='none'\n\n**🔗 Service Connection Strategy (3 scenarios):**\n1.
**User specifies ID explicitly** (e.g., '使用服务连接ID abc123')\n → ✅ Pass
serviceConnectionId=abc123 directly, NO list_service_connections call needed\n2.
**User doesn't specify any ID** (most common case)\n → ✅ Pass
serviceConnectionId=null, tool will auto-retrieve default ID internally\n3.
**User wants to choose from available options** (e.g.,
'显示可用的服务连接让我选择')\n → 🔍 Call list_service_connections first, then
let user choose, then create pipeline\n\n**🤔 When to Use Other Tools:**\n- User
asks to \"select from available repositories\" → use list_repositories first\n-
User wants to \"choose from service connections\" → use list_service_connections
first\n- User wants to see options before deciding → gather info first, then
create\n- For quick creation with current repo → directly use IDE
detection\n\n**✅ Required:** organizationId, name, buildLanguage,
buildTool","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"smart_list_pipelines","description":"[Pipeline
Management] Intelligently search pipelines with natural language time references
(e.g., 'today', 'this
week')","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_pipeline_run","description":"[Pipeline
Management] Run a pipeline with optional
parameters","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_latest_pipeline_run","description":"[Pipeline
Management] Get information about the latest pipeline
run","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_pipeline_run","description":"[Pipeline
Management] Get details of a specific pipeline run
instance","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_pipeline_runs","description":"[Pipeline
Management] Get a list of pipeline run instances with filtering
options","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_pipeline_jobs_by_category","description":"[Pipeline
Management] Get pipeline execution tasks by category. Currently only supports
DEPLOY
category.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_pipeline_job_historys","description":"[Pipeline
Management] Get the execution history of a pipeline task. Retrieve all execution
records for a specific task in a
pipeline.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"execute_pipeline_job_run","description":"[Pipeline
Management] Manually run a pipeline task. Start a specific job in a pipeline run
instance.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_pipeline_job_run_log","description":"[Pipeline
Management] Get the execution logs of a pipeline job. Retrieve the log content
for a specific job in a pipeline
run.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"update_pipeline","description":"[Pipeline
Management] Update an existing pipeline in Yunxiao by pipelineId. Use this to
update pipeline YAML, stages, jobs,
etc.","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_package_repositories","description":"[Packages
Management] List package repositories in an organization with filtering
options","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_artifacts","description":"[Packages
Management] List artifacts in a package repository with filtering
options","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_artifact","description":"[Packages
Management] Get information about a single artifact in a package
repository","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_service_connections","description":"[Service
Connection Management] List service connections in an organization with
filtering
options","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_all_work_item_types","description":"[Project
Management] List all work item types in an
organization","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_work_item_types","description":"[Project
Management] List work item types in a project
space","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_work_item_type","description":"[Project
Management] Get details of a specific work item
type","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_work_item_relation_work_item_types","description":"[Project
Management] List work item types that can be related to a specific work
item","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_work_item_type_field_config","description":"[Project
Management] Get field configuration for a specific work item
type","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"get_work_item_workflow","description":"[Project
Management] Get workflow information for a specific work item
type","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"list_work_item_comments","description":"[Project
Management] List comments for a specific work
item","parameters":{"type":"object","properties":{}}}},{"type":"function","function":{"name":"create_work_item_comment","description":"[Project
Management] Create a comment for a specific work
item","parameters":{"type":"object","properties":{}}}}],"tool_choice":"auto"}
