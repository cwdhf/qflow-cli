# Ignoring files

This document provides an overview of the Qflow Ignore (`.qflowignore`) feature
of the Qflow CLI.

The Qflow CLI includes the ability to automatically ignore files, similar to
`.gitignore` (used by Git) and `.aiexclude` (used by Qflow Code Assist). Adding
paths to your `.qflowignore` file will exclude them from tools that support this
feature, although they will still be visible to other services (such as Git).

## How it works

When you add a path to your `.qflowignore` file, tools that respect this file
will exclude matching files and directories from their operations. For example,
when you use the `@` command to share files, any paths in your `.qflowignore`
file will be automatically excluded.

For the most part, `.qflowignore` follows the conventions of `.gitignore` files:

- Blank lines and lines starting with `#` are ignored.
- Standard glob patterns are supported (such as `*`, `?`, and `[]`).
- Putting a `/` at the end will only match directories.
- Putting a `/` at the beginning anchors the path relative to the `.qflowignore`
  file.
- `!` negates a pattern.

You can update your `.qflowignore` file at any time. To apply the changes, you
must restart your Qflow CLI session.

## How to use `.qflowignore`

To enable `.qflowignore`:

1. Create a file named `.qflowignore` in the root of your project directory.

To add a file or directory to `.qflowignore`:

1. Open your `.qflowignore` file.
2. Add the path or file you want to ignore, for example: `/archive/` or
   `apikeys.txt`.

### `.qflowignore` examples

You can use `.qflowignore` to ignore directories and files:

```
# Exclude your /packages/ directory and all subdirectories
/packages/

# Exclude your apikeys.txt file
apikeys.txt
```

You can use wildcards in your `.qflowignore` file with `*`:

```
# Exclude all .md files
*.md
```

Finally, you can exclude files and directories from exclusion with `!`:

```
# Exclude all .md files except README.md
*.md
!README.md
```

To remove paths from your `.qflowignore` file, delete the relevant lines.
