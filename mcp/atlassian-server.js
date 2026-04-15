#!/usr/bin/env node
'use strict';

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Config helpers ───────────────────────────────────────────────────────────

function loadConfig() {
  const configPath = path.join(os.homedir(), '.v23cc', 'config.json');
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(data) {
  const configDir = path.join(os.homedir(), '.v23cc');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'config.json'),
    JSON.stringify(data, null, 2) + '\n',
    'utf8'
  );
}

function getAtlassianConfig() {
  return loadConfig().atlassian || null;
}

function getActivePreset() {
  const models = loadConfig().models || {};
  return Object.values(models).find((m) => m.active) || null;
}

// ─── Atlassian API helpers ────────────────────────────────────────────────────

function makeAuthHeader(email, token) {
  return 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64');
}

async function atlassianRequest(url, auth) {
  const res = await fetch(url, {
    headers: {
      Authorization: auth,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Atlassian API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Local LLM helper ─────────────────────────────────────────────────────────

async function callLocalLLM(prompt, preset) {
  const model = preset?.model || 'mlx-community/gemma-4-e4b-it-4bit';
  const port = preset?.port || 9000;

  const res = await fetch(`http://localhost:${port}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM server error ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function getTimestamp() {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '');
  return { date, time };
}

function getOutputDir() {
  return path.join(process.cwd(), 'v23cc');
}

// ─── Tool: jira_search ────────────────────────────────────────────────────────

async function jiraSearch({ query, project, max = 20, type, assignee }) {
  const atlassian = getAtlassianConfig();
  if (!atlassian) throw new Error('Atlassian not configured. Run jira_init first.');

  const { domain, email, token } = atlassian;
  const auth = makeAuthHeader(email, token);

  let jql = query ? `text ~ "${query}"` : 'ORDER BY updated DESC';
  if (assignee) jql = (query ? jql + ` AND ` : '') + `assignee = "${assignee}"`;
  if (project) jql += ` AND project = "${project}"`;
  if (type) jql += ` AND issuetype = "${type}"`;
  if (!jql.includes('ORDER BY')) jql += ' ORDER BY updated DESC';

  const url =
    `https://${domain}.atlassian.net/rest/api/3/search/jql` +
    `?jql=${encodeURIComponent(jql)}` +
    `&fields=summary,status,assignee,issuetype,priority,updated` +
    `&maxResults=${max}`;

  const data = await atlassianRequest(url, auth);
  const issues = data.issues || [];

  // Group by issue type
  const groups = {};
  for (const issue of issues) {
    const typeName = issue.fields.issuetype?.name || 'Other';
    if (!groups[typeName]) groups[typeName] = [];
    groups[typeName].push(issue);
  }

  const { date, time } = getTimestamp();
  const displayTime = time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');

  const searchLabel = [query, assignee ? `assignee:${assignee}` : ''].filter(Boolean).join(' ');
  let md = `# Jira Search: "${searchLabel}"\n\n`;
  md += `**Date:** ${date} ${displayTime}  \n`;
  md += `**Total:** ${issues.length} issues\n\n`;

  const typeOrder = ['Bug', 'Story', 'Task', 'Epic', 'Sub-task'];
  const ordered = [
    ...typeOrder.filter((t) => groups[t]),
    ...Object.keys(groups).filter((t) => !typeOrder.includes(t)),
  ];

  for (const typeName of ordered) {
    const group = groups[typeName];
    md += `## ${typeName} (${group.length})\n\n`;
    md += `| Key | Summary | Status | Assignee | Priority |\n`;
    md += `|-----|---------|--------|----------|----------|\n`;

    for (const issue of group) {
      const key = issue.key;
      const link = `https://${domain}.atlassian.net/browse/${key}`;
      const summary = (issue.fields.summary || '').replace(/\|/g, '\\|');
      const status = issue.fields.status?.name || '-';
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const priority = issue.fields.priority?.name || '-';
      md += `| [${key}](${link}) | ${summary} | ${status} | ${assignee} | ${priority} |\n`;
    }
    md += '\n';
  }

  const outDir = getOutputDir();
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `jira-${date}-${time}.md`;
  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, md, 'utf8');

  return { filepath, content: md, count: issues.length };
}

// ─── Tool: confluence_search ──────────────────────────────────────────────────

async function confluenceSearch({ query, space, max = 10, type }) {
  const atlassian = getAtlassianConfig();
  if (!atlassian) throw new Error('Atlassian not configured. Run jira_init first.');

  const { domain, email, token } = atlassian;
  const auth = makeAuthHeader(email, token);
  const preset = getActivePreset();

  let cql = `text ~ "${query}"`;
  if (space) cql += ` AND space.key = "${space}"`;
  if (type) cql += ` AND type = "${type}"`;
  cql += ' ORDER BY lastModified DESC';

  const url =
    `https://${domain}.atlassian.net/wiki/rest/api/content/search` +
    `?cql=${encodeURIComponent(cql)}` +
    `&expand=body.storage,space,version` +
    `&limit=${max}`;

  const data = await atlassianRequest(url, auth);
  const pages = data.results || [];

  const { date, time } = getTimestamp();
  const displayTime = time.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3');

  let md = `# Confluence Search: "${query}"\n\n`;
  md += `**Date:** ${date} ${displayTime}  \n`;
  md += `**Total:** ${pages.length} pages\n\n`;

  for (const page of pages) {
    const title = page.title;
    const pageUrl = `https://${domain}.atlassian.net/wiki${page._links?.webui || ''}`;
    const spaceName = page.space?.name || page.space?.key || '-';
    const rawBody = page.body?.storage?.value || '';
    const plainText = stripHtml(rawBody).slice(0, 4000);

    md += `## [${title}](${pageUrl})\n\n`;
    md += `**Space:** ${spaceName}\n\n`;

    if (plainText) {
      if (preset) {
        try {
          const prompt = `Summarize the following Confluence page content in 2-3 concise sentences:\n\n${plainText}`;
          const summary = await callLocalLLM(prompt, preset);
          md += `**Summary:** ${summary.trim()}\n\n`;
        } catch {
          md += `**Content:** ${plainText.slice(0, 500)}...\n\n`;
        }
      } else {
        md += `**Content:** ${plainText.slice(0, 500)}...\n\n`;
      }
    }

    md += '---\n\n';
  }

  const outDir = getOutputDir();
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `confluence-${date}-${time}.md`;
  const filepath = path.join(outDir, filename);
  fs.writeFileSync(filepath, md, 'utf8');

  return { filepath, content: md, count: pages.length };
}

// ─── Tool: jira_init ──────────────────────────────────────────────────────────

async function jiraInit({ domain, email, token }) {
  const auth = makeAuthHeader(email, token);
  const url = `https://${domain}.atlassian.net/rest/api/3/myself`;

  await atlassianRequest(url, auth);

  const config = loadConfig();
  config.atlassian = { domain, email, token };
  saveConfig(config);

  return { message: `Connected and saved credentials for ${domain}.atlassian.net` };
}

// ─── MCP Server setup ─────────────────────────────────────────────────────────

const server = new Server(
  { name: 'v23cc-atlassian', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'jira_search',
      description: 'Search Jira issues and write grouped results to a markdown file in v23cc/',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text (optional if assignee is set)' },
          project: { type: 'string', description: 'Project key filter (optional)' },
          max: { type: 'number', description: 'Max results (default 20)' },
          type: { type: 'string', description: 'Issue type filter: Bug, Story, Task (optional)' },
          assignee: { type: 'string', description: 'Assignee display name filter (optional)' },
        },
        required: [],
      },
    },
    {
      name: 'confluence_search',
      description:
        'Search Confluence pages and write summarized results (via local LLM) to a markdown file in v23cc/',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query text' },
          space: { type: 'string', description: 'Space key filter (optional)' },
          max: { type: 'number', description: 'Max results (default 10)' },
          type: { type: 'string', description: 'Content type filter (optional)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'jira_init',
      description: 'Configure and test Atlassian credentials',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Atlassian subdomain (e.g. mycompany)' },
          email: { type: 'string', description: 'Atlassian account email' },
          token: { type: 'string', description: 'Atlassian API token' },
        },
        required: ['domain', 'email', 'token'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'jira_search') {
      const result = await jiraSearch(args);
      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.count} issues. Written to: ${result.filepath}\n\n${result.content}`,
          },
        ],
      };
    }

    if (name === 'confluence_search') {
      const result = await confluenceSearch(args);
      return {
        content: [
          {
            type: 'text',
            text: `Found ${result.count} pages. Written to: ${result.filepath}\n\n${result.content}`,
          },
        ],
      };
    }

    if (name === 'jira_init') {
      const result = await jiraInit(args);
      return {
        content: [{ type: 'text', text: result.message }],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (e) {
    return {
      content: [{ type: 'text', text: `Error: ${e.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error('MCP server error:', e.message);
  process.exit(1);
});
