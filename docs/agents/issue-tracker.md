# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues. Use the `gh` CLI for all operations and infer the repository from `git remote -v`.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <file> --label "..."`.
- **Read an issue**: `gh issue view <number> --comments --json number,title,body,state,assignees,labels,comments,url`.
- **List issues**: `gh issue list --state open --json number,title,body,assignees,labels,url` with appropriate label filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Assign an issue**: `gh issue edit <number> --add-assignee "@me"`.
- **Apply or remove labels**: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`.
- **Close an issue**: `gh issue close <number> --comment "..."`.

When a skill says to publish to the issue tracker, create a GitHub issue. When a skill says to fetch a ticket, read the full issue and its comments.

## Wayfinding operations

Wayfinder maps and tickets use these labels:

- `wayfinder:map`
- `wayfinder:research`
- `wayfinder:prototype`
- `wayfinder:grilling`
- `wayfinder:task`

Create the map and every currently specifiable ticket before wiring relationships. Add each ticket as a native child of the map:

```sh
gh api --method POST \
  repos/{owner}/{repo}/issues/{map_number}/sub_issues \
  -F sub_issue_id={ticket_database_id}
```

Use GitHub's native issue dependencies. To make a ticket depend on a blocker:

```sh
gh api --method POST \
  -H 'X-GitHub-Api-Version: 2026-03-10' \
  repos/{owner}/{repo}/issues/{blocked_ticket_number}/dependencies/blocked_by \
  -F issue_id={blocker_database_id}
```

List map children and a ticket's blockers with:

```sh
gh api repos/{owner}/{repo}/issues/{map_number}/sub_issues --paginate
gh api -H 'X-GitHub-Api-Version: 2026-03-10' \
  repos/{owner}/{repo}/issues/{ticket_number}/dependencies/blocked_by --paginate
```

The frontier is the map's open, unassigned child issues for which every blocker is closed. A session must claim a frontier ticket by assigning it to the developer before doing any work.

Resolve exactly one ticket per Wayfinder session: post the answer as a resolution comment, close the ticket, and append a one-line linked gist to the map's **Decisions so far** section. Add newly visible tickets and relationships in a create-then-wire pass, and keep the map's fog and scope sections current.
