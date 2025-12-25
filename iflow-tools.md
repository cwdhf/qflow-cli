list_directory

完整提示词：1 Lists the names of files and subdirectories directly within a
specified directory path. Can optionally ignore entries matching provided glob
patterns. 2 3 Usage notes: 4 - The path parameter MUST be an absolute path 5 -
Returns only direct children, not recursive 6 - Can filter out entries using
glob patterns 7 - Respects .gitignore and .iflowignore files when configured 8 9
Parameters: 10 - path (required): The absolute path to the directory to list
11 - ignore (optional): List of glob patterns to ignore 12 -
file_filtering_options (optional): Configuration for ignore files 13 -
respect_git_ignore: Whether to respect .gitignore patterns (default: true) 14 -
respect_gemini_ignore: Whether to respect .iflowignore patterns (default: true)
15 16 Returns: 17 - names: Array of file and directory names 18 - type: Always
returns "directory"

read_file

完整提示词：1 Reads and returns the content of a specified file from the local
filesystem. Handles text files, images (PNG, JPG, GIF, WEBP, SVG, BMP), PDF
files (extracts text content), DOCX files (extracts text content), and Excel
files (converts to text table format). For text files, it can read specific line
ranges. 2 3 Supported file types: 4 - Text files: .txt, .js, .py, .html, .css,
.json, .xml, .md, etc. 5 - Images: PNG, JPG, GIF, WEBP, SVG, BMP 6 - Documents:
PDF, DOCX 7 - Spreadsheets: Excel files 8 9 Parameters: 10 - absolute_path
(required): The absolute path to the file to read 11 - offset (optional): For
text files, the 0-based line number to start reading from. Requires 'limit' to
be set. 12 - limit (optional): For text files, maximum number of lines to read.
Use with 'offset' to paginate through large files. 13 14 Usage notes: 15 -
Absolute paths are required, relative paths are not supported 16 - For large
files, use offset and limit for pagination 17 - Image files return metadata and
basic information 18 - PDF/DOCX files extract text content 19 - Excel files
convert to text table format 20 21 Returns: 22 - content: The file content 23 -
type: File MIME type or content type 24 - size: File size in bytes (when
available)

write_file

完整提示词：1 Writes content to a specified file in the local filesystem.
Creates the file if it doesn't exist, overwrites if it does exist. 2 3
Parameters: 4 - file_path (required): The absolute path to the file to write to
5 - content (required): The content to write to the file 6 7 Usage notes: 8 -
Absolute paths are required, relative paths are not supported 9 - Creates
directories if they don't exist 10 - Overwrites existing files completely 11 -
Be careful with system files and important configurations 12 13 Returns: 14 -
success: Boolean indicating if the write operation succeeded 15 - message:
Status message describing the result

replace

完整提示词：1 Replaces text within a file. Replaces a single occurrence. This
tool requires providing significant context around the change to ensure precise
targeting. Always use the read_file tool to examine the file's current content
before attempting a text replacement. 2 3 Critical requirements: 4 1. file_path
MUST be an absolute path 5 2. old_string MUST be the exact literal text to
replace (including all whitespace, indentation, newlines) 6 3. new_string MUST
be the exact literal text to replace old_string with 7 4. instruction must be a
clear, semantic instruction for the code change 8 5. old_string and new_string
must be different 9 10 Parameters: 11 - file_path (required): The absolute path
to the file to modify 12 - instruction (required): A clear, semantic instruction
for the code change 13 - old_string (required): The exact literal text to
replace, include at least 3 lines of context BEFORE and AFTER 14 - new_string
(required): The exact literal text to replace old_string with 15 16 Usage notes:
17 - Include sufficient context (at least 3 lines before/after) to uniquely
identify the replacement target 18 - Multiple identical matches will cause the
tool to fail 19 - Break down complex changes into multiple smaller atomic calls
20 - Never escape old_string or new_string - use exact literal text 21 22 Good
instruction example: 23 "In the 'calculateTotal' function, correct the sales tax
calculation by updating the 'taxRate' constant from 0.05 to 0.075 to reflect the
new regional tax laws." 24 25 Bad instruction examples: 26 - "Change the text."
(Too vague) 27 - "Fix the bug." (Doesn't explain the bug or the fix) 28 -
"Replace the line with this new line." (Brittle, just repeats parameters) 29 30
Returns: 31 - success: Boolean indicating if the replacement succeeded 32 -
message: Status message describing the result

glob

完整提示词：1 Efficiently finds files matching specific glob patterns (e.g.,
`src/**/*.ts`, `**/*.md`), returning absolute paths sorted by modification time
(newest first). Ideal for quickly locating files based on their name or path
structure, especially in large codebases. 2 3 Supported glob patterns: 4 - _
matches any number of characters (except /) 5 - ** matches any number of
characters (including /) 6 - ? matches a single character 7 - [abc] matches any
character in the set 8 - {a,b,c} matches any of the alternatives 9 10
Parameters: 11 - pattern (required): The glob pattern to match against 12 - path
(optional): The absolute path to the directory to search within 13 -
case_sensitive (optional): Whether the search should be case-sensitive (default:
false) 14 - respect_git_ignore (optional): Whether to respect .gitignore
patterns (default: true) 15 16 Usage notes: 17 - Returns absolute paths sorted
by modification time (newest first) 18 - Very efficient for large codebases 19 -
Common patterns: 20 - **/_.py - All Python files recursively 21 - src/\*_/_.ts -
All TypeScript files in src directory 22 - docs/_.md - All Markdown files in
docs directory 23 - test\__.py - Python files starting with test\_ 24 25
Returns: 26 - Array of absolute file paths matching the pattern

search_file_content

完整提示词：1 Searches for a regular expression pattern within the content of
files or directories using ripgrep for fast performance. Can search in a
specific file or recursively in a directory. Can filter files by a glob pattern.
Returns the lines containing matches, along with their file paths and line
numbers. Directory results limited to 20,000 matches like VSCode. 2 3
Parameters: 4 - pattern (required): The regular expression pattern to search for
within file contents 5 - path (optional): The absolute path to the file or
directory to search within. If omitted, searches the current working directory.
6 - include (optional): A glob pattern to filter which files are searched 7 8
Usage notes: 9 - Uses ripgrep for high performance searching 10 - Supports full
regular expression syntax 11 - Recursive search by default for directories 12 -
Limited to 20,000 matches to prevent overwhelming results 13 - Returns file
path, line number, and matching content 14 15 Common regex patterns: 16 -
'function\\s+myFunction' - Function definitions 17 -
'import\\s+\\{._\\}\\s+from\\s+._' - ES6 imports 18 - 'class\\s+\\w+' - Class
definitions 19 - 'TODO|FIXME|HACK' - Code comments 20 21 Returns: 22 - Array of
matches with file path, line number, and content

image_read

完整提示词：1 Reads image files (file path or base64 data) and generates
detailed contextual analysis using VL models. The tool accepts prompt
information to create targeted image descriptions. 2 3 Parameters: 4 -
image_input (required): Image input - either absolute file path or base64
encoded image data 5 - prompt (required): A comprehensive Vision Language Model
(VLM) instruction 6 - task_brief (optional): Brief task description displayed on
the CLI, under 15 words 7 - input_type (optional): Input type - 'file_path' for
file path input, 'base64' for base64 encoded data input (default: 'file_path')
8 - mime_type (optional): Image MIME type when input_type is 'base64' 9 10
Prompt construction requirements: 11 The prompt must be highly structured and
precise: 12 1. **Persona & Context Priming**: Assign a specialized role AND
explicitly define the expected image type 13 2. **Context and Requirement**: The
context of this task and task detail 14 3. **Visual Chain of Thought**: Command
the VLM to use a 'Scan -> Locate -> Extract' workflow 15 4. **Strict
Constraints**: 16 - 'Transcribe verbatim' (preserve typos/grammar) 17 -
**Fallback Mechanism**: Explicitly dictate what to return if data is missing
18 - **Output Purity**: Forbid conversational filler 19 5. **Structured
Output**: Define the exact output information required 20 21 Example prompt
structure: 22 "Act as a Forensic Accountant analyzing a low-quality scanned
receipt. Scan the entire receipt, locate the merchant name and total amount,
extract this data verbatim. If any field is unclear, return 'N/A' - do not
guess. Start response immediately, no conversational preamble. Output: Merchant:
[extracted], Total: [extracted], Date: [extracted]" 23 24 Returns: 25 -
analysis: Detailed image analysis result 26 - confidence: Confidence score of
the analysis

run_shell_command

完整提示词：1 This tool executes a given shell command as `bash -c <command>`.
Command is executed as a subprocess that leads its own process group. Command
process group can be terminated as `kill -- -PGID` or signaled as
`kill -s SIGNAL -- -PGID`. 2 3 Parameters: 4 - command (required): Exact bash
command to execute as `bash -c <command>` 5 - description (required): Brief
description of the command for the user. Be specific and concise. Ideally a
single sentence. Can be up to 3 sentences for clarity. No line breaks. 6 -
run_in_bg (optional): Set to true to run this command in the background. Use
ReadBashOutput to read the output later. 7 - dir_path (optional): The path of
the directory to run the command in. Must be a directory within the workspace
and must already exist. 8 - timeout (optional): Timeout in seconds for the
command execution. If not provided, uses the default timeout of 120s. 9 10 Usage
notes: 11 - Commands execute with bash -c wrapper 12 - Background commands allow
continued work while running 13 - Use ReadBashOutput to monitor background
command output 14 - Interactive commands are not supported and may hang 15 -
Process groups allow for clean termination 16 17 Safety considerations: 18 -
Commands that modify the filesystem should be explained first 19 - Avoid
interactive commands that require user input 20 - Background commands are useful
for long-running operations 21 22 Returns: 23 - command: Executed command 24 -
directory: Directory where command was executed 25 - stdout: Output on stdout
stream 26 - stderr: Output on stderr stream 27 - error: Error information or
none 28 - exit_code: Exit code or none if terminated by signal 29 - signal:
Signal number or none 30 - background_pids: List of background processes started
31 - process_group_pgid: Process group started

ReadBashOutput

完整提示词：1 Retrieves output from a running or completed task started with
run_shell_command with run_in_bg=true. 2 3 Parameters: 4 - task_id (required):
The ID of a task to get output from 5 - poll_interval (optional): Polling
interval in seconds before next read (default: 10, max: 120) 6 7 Usage notes:
8 - Only works with background tasks started with run_shell_command 9 - Can be
called multiple times to get incremental output 10 - Useful for monitoring
long-running commands 11 - Polling interval controls how frequently to check for
new output 12 13 Returns: 14 - stdout: Accumulated standard output 15 - stderr:
Accumulated standard error 16 - exit_code: Exit code if completed 17 - status:
Current task status (running/completed/failed)

web_fetch

完整提示词：1 Processes content from URL(s), including local and private network
addresses (e.g., localhost), embedded in a prompt. Include up to 20 URLs and
instructions (e.g., summarize, extract specific data) directly in the 'prompt'
parameter. 2 3 Parameters: 4 - prompt (required): A comprehensive prompt that
includes the URL(s) (up to 20) to fetch and specific instructions on how to
process their content. Must contain at least one URL starting with http:// or
https://. 5 6 Usage notes: 7 - Can handle multiple URLs in a single request (up
to 20) 8 - Supports local and private network addresses 9 - URLs must start with
http:// or https:// 10 - Include specific processing instructions in the prompt
11 - Useful for web scraping, API calls, content analysis 12 13 Example prompts:
14 - "Summarize https://example.com/article and extract key points from
https://another.com/data" 15 - "Get the JSON from https://api.example.com/users
and list all user names" 16 - "Fetch https://localhost:3000/health and check if
the service is running" 17 18 Returns: 19 - content: Processed content from the
URLs 20 - urls: List of URLs that were accessed 21 - status_codes: HTTP status
codes for each URL 22 - error: Error information if any

web_search

完整提示词：1 Performs a web search using Web Search and returns the results.
This tool is useful for finding information on the internet based on a query. 2
3 Parameters: 4 - query (required): The search query to find information on the
web. 5 6 Usage notes: 7 - Supports natural language queries 8 - Returns relevant
web pages and content 9 - Useful for research, fact-checking, and information
gathering 10 - Can handle complex queries with multiple concepts 11 12 Example
queries: 13 - "React hooks best practices 2024" 14 - "how to implement
authentication in Node.js" 15 - "latest trends in machine learning" 16 17
Returns: 18 - results: Array of search results with title, URL, and snippet 19 -
total_results: Approximate total number of results 20 - query: The original
search query

todo_write

完整提示词：1 Use this tool to create and manage a structured task list for your
current coding session. This helps you track progress, organize complex tasks,
and demonstrate thoroughness to the user. 2 3 When to use this tool: 4 1.
Complex multi-step tasks (3+ distinct steps) 5 2. Non-trivial tasks requiring
careful planning 6 3. User explicitly requests todo list 7 4. User provides
multiple tasks 8 5. After receiving new instructions 9 6. When starting work on
a task - mark as in_progress BEFORE beginning 10 7. After completing a task -
mark as completed and add follow-up tasks 11 12 When NOT to use this tool: 13 1.
Single, straightforward tasks 14 2. Trivial tasks with no organizational benefit
15 3. Tasks completed in less than 3 trivial steps 16 4. Purely conversational
or informational tasks 17 18 Task states and management: 19 - Task States:
pending, in_progress, completed, failed 20 - Task Management: Update status in
real-time, only have ONE task in_progress at a time 21 - Task Completion: Only
mark as completed when FULLY accomplished 22 - Task Breakdown: Create specific,
actionable items 23 24 Parameters: 25 - todos (required): Array of todo items
26 - id: Unique identifier for the todo item 27 - task: Description of the todo
28 - status: Current status - pending/in_progress/completed/failed 29 -
priority: Priority level - high/medium/low 30 31 Returns: 32 - success: Boolean
indicating if the operation succeeded 33 - todos: Updated todo list

todo_read

完整提示词：1 Use this tool to read the current to-do list for the session. This
tool should be used proactively and frequently to ensure that you are aware of
the status of the current task list. 2 3 Usage recommendations: 4 - At the
beginning of conversations to see what's pending 5 - Before starting new tasks
to prioritize work 6 - When the user asks about previous tasks or plans 7 -
Whenever you're uncertain about what to do next 8 - After completing tasks to
update understanding of remaining work 9 - After every few messages to ensure
you're on track 10 11 Parameters: 12 - No parameters required 13 14 Returns:
15 - todos: Array of current todo items with status, priority, and content 16 -
empty_list: Boolean indicating if no todos exist

ask_user_question

完整提示词：1 Use this tool when you need to ask the user questions during
execution. This allows you to gather user preferences or requirements, clarify
ambiguous instructions, get decisions on implementation choices, and offer
choices to the user about what direction to take. 2 3 Parameters: 4 - questions
(required): Questions to ask the user (1-4 questions) 5 - question: The complete
question to ask the user. Should be clear, specific, and end with a question
mark. 6 - header: Very short label displayed as a chip/tag (max 12 chars) 7 -
options: Available choices for this question (2-4 options) 8 - label: Display
text for the option (1-5 words) 9 - description: Explanation of what this option
means 10 - multiSelect: Set to true to allow multiple selections 11 12 Usage
notes: 13 - Users will always be able to select "Other" to provide custom text
input 14 - Use multiSelect: true to allow multiple answers 15 - Questions should
be clear and specific 16 - Options should be distinct and mutually exclusive
(unless multiSelect is enabled) 17 18 Returns: 19 - answers: User's selected
answers for each question

save_memory

完整提示词：1 Saves a specific piece of information or fact to your long-term
memory. 2 3 When to use this tool: 4 - When the user explicitly asks you to
remember something 5 - When the user states a clear, concise fact about
themselves, their preferences, or their environment that seems important for
future interactions 6 7 When NOT to use this tool: 8 - To remember
conversational context only relevant for the current session 9 - To save long,
complex, or rambling pieces of text 10 - If unsure whether the information is
worth remembering long-term 11 12 Parameters: 13 - fact (required): The specific
fact or piece of information to remember. Should be a clear, self-contained
statement. 14 15 Examples of good facts to remember: 16 - "My favorite color is
blue" 17 - "I prefer using TypeScript over JavaScript" 18 - "My cat's name is
Whiskers" 19 20 Returns: 21 - success: Boolean indicating if the fact was saved
22 - message: Confirmation message

task

完整提示词：1 Launch a new agent to handle complex, multi-step tasks
autonomously. 2 3 Available agent types: 4 - general-purpose: For complex
research, code searching, and multi-step tasks 5 - plan-agent: For planning,
analysis, and outlining implementation steps without making changes 6 -
explore-agent: For exploring, understanding and analyzing codebases/projects
without making changes 7 8 Agent type naming rules: 9 - subagent_type parameter
MUST be EXACTLY the same as the agent type name 10 - Valid names:
"general-purpose", "plan-agent", "explore-agent" 11 12 When to use the Task
tool: 13 - When instructed to execute custom slash commands 14 - For complex,
multi-step tasks that match agent descriptions 15 - For complex research
requiring multiple file reads and analysis 16 - For exploring codebases to
understand architecture 17 18 When NOT to use the Task tool: 19 - If you want to
read a specific file path, use read_file or glob instead 20 - If searching for a
specific class definition, use glob instead 21 - If searching code within
specific files, use read_file instead 22 - For other tasks not matching agent
descriptions 23 24 Usage notes: 25 - Can launch multiple agents concurrently for
parallel processing 26 - Agent invocation is stateless - provide detailed task
description 27 - Agent outputs should generally be trusted 28 - Tell agent
whether to write code or do research 29 - Use proactively when task matches
agent descriptions 30 31 Parameters: 32 - description (required): Short (3-5
word) description of the task 33 - prompt (required): The task for the agent to
perform 34 - subagent_type (required): Agent type -
"general-purpose"/"plan-agent"/"explore-agent" 35 - useContext (optional):
Whether to include main agent's context and prompt 36 - outputFormat (optional):
Output format template for the task result 37 - constraints (optional):
Constraints or limitations for task execution 38 39 Returns: 40 - result: The
agent's completion result 41 - agent_type: The type of agent that was used 42 -
execution_time: Time taken by the agent

xml_escape

完整提示词：1 Automatically escapes special characters in XML/HTML files to make
them valid. This tool will: 2 - Replace < with &lt; (except in tags) 3 -
Replace > with &gt; (except in tags) 4 - Replace & with &amp; (except in
existing entities) 5 - Replace " with &quot; (in attribute values) 6 - Replace '
with &apos; (in attribute values) 7 8 The tool intelligently detects which
characters need escaping based on their context. 9 10 Parameters: 11 - file_path
(required): The absolute path to the XML/HTML file to escape 12 - escape_all
(optional): If true, escapes all special characters. If false (default), only
escapes characters in text content 13 14 Usage notes: 15 - Intelligently detects
context to avoid escaping tags 16 - Preserves existing HTML entities 17 -
Handles attribute values correctly 18 - Useful for fixing malformed XML/HTML
files 19 20 Returns: 21 - success: Boolean indicating if the operation succeeded
22 - message: Status message describing the result 23 - escaped_count: Number of
characters that were escaped
