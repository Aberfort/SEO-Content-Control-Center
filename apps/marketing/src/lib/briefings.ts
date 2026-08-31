export type BriefingSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BriefingFaq = {
  question: string;
  answer: string;
};

export type Briefing = {
  slug: string;
  category: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  published: string;
  updated: string;
  readingTime: string;
  intro: string[];
  sections: BriefingSection[];
  faq: BriefingFaq[];
  related: string[];
};

export const briefings: Briefing[] = [
  {
    slug: "wordpress-seo-audit-checklist",
    category: "Audit",
    title: "A WordPress SEO audit checklist you can actually finish",
    metaTitle: "WordPress SEO Audit Checklist (10 Content Checks)",
    metaDescription:
      "A practical WordPress SEO audit checklist: noindex risk, missing titles and meta descriptions, canonical conflicts, thin content, orphan pages, and stale posts.",
    summary:
      "Most WordPress SEO audits stall because they produce a 300-row export nobody triages. Ten content-level checks cover the failures that actually suppress traffic.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "7 min read",
    intro: [
      "A WordPress SEO audit fails for a predictable reason: it returns everything a crawler can measure, and almost none of it maps to a decision. The team gets a spreadsheet, skims it once, and the file ages out.",
      "The alternative is to audit a narrow set of content-level conditions that are unambiguous, repeatable, and directly tied to whether a page can rank at all. The ten checks below are ordered by how much damage they do when left alone."
    ],
    sections: [
      {
        heading: "1. Published content marked noindex",
        paragraphs: [
          "This is the only check on the list that can remove a page from Google entirely, and it is far more common than teams expect. A staging-era default, a bulk edit, a theme migration, or a per-post toggle in Yoast or Rank Math can leave a live, linked, internally promoted page excluded from the index.",
          "Audit it first, and audit it on published content only. A noindex on a draft, an archive, or a tag page may be entirely intentional."
        ]
      },
      {
        heading: "2. Missing SEO titles",
        paragraphs: [
          "When no SEO title is set, WordPress falls back to the post title plus whatever pattern the active SEO plugin applies. Sometimes that is fine. Often it produces a truncated, duplicated, or context-free result in the SERP.",
          "Treat a missing title as a prioritization signal rather than an automatic rewrite: fix the ones on pages that already have impressions first, because those are the pages where a better title converts existing visibility into clicks."
        ]
      },
      {
        heading: "3. Missing meta descriptions",
        paragraphs: [
          "Google frequently rewrites meta descriptions, which leads some teams to skip them entirely. That reasoning is backwards. A missing description guarantees a generated snippet; a written one gives you a chance at controlling the pitch on queries where the snippet is stable.",
          "The ROI concentrates on commercial pages and on posts with high impressions and weak click-through."
        ]
      },
      {
        heading: "4. Canonical tags pointing somewhere else",
        paragraphs: [
          "A canonical that points to a different URL tells Google to consolidate this page into another one. That is correct for genuine duplicates and destructive everywhere else.",
          "Cross-domain canonicals deserve special scrutiny. A canonical pointing at a staging host, a preview deployment, or an old domain will quietly de-index the version you actually want to rank."
        ]
      },
      {
        heading: "5. Thin content",
        paragraphs: [
          "Word count is not a ranking factor, but it is a usable proxy for whether a page has enough substance to satisfy an informational query. A 120-word post competing against 1,500-word results is not going to win on merit.",
          "Thin pages generally have three good outcomes: expand them, merge them into a stronger page with a redirect, or remove them. Doing nothing is the only option that keeps the crawl cost without the benefit."
        ]
      },
      {
        heading: "6. Orphan content",
        paragraphs: [
          "An orphan page has no inbound internal links. Google may still find it through the sitemap, but it receives almost no internal authority and no contextual signal about what it is for.",
          "Pages with exactly one inbound internal link deserve the same attention. They are usually reachable only from an archive listing, which will drop them as the archive paginates."
        ]
      },
      {
        heading: "7. Stale content on time-sensitive queries",
        paragraphs: [
          "Freshness matters unevenly. A reference definition can sit untouched for years. A comparison post, a pricing page, or anything with a year in the title decays fast.",
          "Sort stale content by impressions rather than by age. A four-year-old page with no impressions is not the problem; a four-year-old page with 3,000 monthly impressions and a falling position is."
        ]
      },
      {
        heading: "8. Pages losing clicks period over period",
        paragraphs: [
          "This is where Search Console stops being a dashboard and starts being a work queue. Compare the last period against the one before it, at the page level, and isolate the URLs with real click loss.",
          "Resist the reflex to rewrite. A decline can come from seasonal demand, a SERP layout change, a competitor, a ranking loss, or an indexability problem, and each of those has a different response."
        ]
      },
      {
        heading: "9. High-impression, low-CTR pages",
        paragraphs: [
          "These are the cheapest wins in any audit. The page already ranks well enough to be seen; it is losing on the snippet, not on the content.",
          "Title and description work here pays back in days, not months, because no re-ranking is required."
        ]
      },
      {
        heading: "10. Duplicate or near-duplicate targeting",
        paragraphs: [
          "When two pages target the same intent, they split internal links and confuse the search engine about which to serve. Consolidation usually beats optimization.",
          "Pick the URL with the stronger history, merge the unique substance into it, and redirect the loser."
        ]
      },
      {
        heading: "Running the checklist without a spreadsheet",
        paragraphs: [
          "The reason these checks get skipped is not that they are hard. It is that running them by hand across a few hundred URLs, every month, is tedious enough that it never becomes routine.",
          "The free Content Signal WordPress plugin runs checks 1 through 7 locally, in bounded background batches, with no account and no external request. It compares each scan against the previous one so you see what is new and what is resolved, and it exports the whole result to CSV. Checks 8 and 9 need Search Console data, which is what the connected platform adds."
        ],
        bullets: [
          "Run the local audit first and fix the unambiguous failures.",
          "Sort what remains by impressions, not by severity label.",
          "Re-run after the fixes and keep only the delta."
        ]
      }
    ],
    faq: [
      {
        question: "How often should I run a WordPress SEO audit?",
        answer:
          "Monthly is right for most sites. High-volume publishers benefit from weekly runs, because the value is in the delta between scans rather than in any single snapshot."
      },
      {
        question: "Does this replace Yoast SEO or Rank Math?",
        answer:
          "No. Yoast and Rank Math set the metadata; an audit checks whether that metadata is actually correct and complete across the whole site. Content Signal is read-only and runs alongside them."
      },
      {
        question: "What is the difference between thin content and low-quality content?",
        answer:
          "Thin content is a length signal you can measure automatically. Low quality is a judgment about usefulness. Automated audits find the first and give a human the shortlist for the second."
      }
    ],
    related: ["search-console-traffic-drop", "orphan-pages-wordpress"]
  },
  {
    slug: "search-console-traffic-drop",
    category: "Search Console",
    title: "Diagnosing a Search Console traffic drop without rewriting everything",
    metaTitle: "Search Console Traffic Drop: A Diagnostic Order",
    metaDescription:
      "Clicks fell in Google Search Console. Work through demand, indexability, ranking, CTR, and site changes in order before you touch a single page.",
    summary:
      "A drop in clicks has at least five distinct causes, and they call for opposite responses. Separating the observation from the reaction is most of the work.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "6 min read",
    intro: [
      "Clicks are down. The instinct is to open the biggest losing page and start rewriting. That instinct is wrong roughly half the time, and the rewrite costs a week you cannot recover.",
      "Traffic is a product of several independent factors. Work through them in order, because the first one that explains the drop is usually the only one that matters."
    ],
    sections: [
      {
        heading: "Step 1: Confirm the drop is real",
        paragraphs: [
          "Compare like periods. A 28-day window against the previous 28 days is stable; last week against this week is noise. Check whether the last two or three days are simply incomplete, since Search Console data lags.",
          "Then check whether the drop is site-wide or concentrated. A site-wide drop points at indexability, a manual action, or a core update. A drop concentrated in ten URLs is a page-level problem."
        ]
      },
      {
        heading: "Step 2: Separate impressions from position from CTR",
        paragraphs: [
          "This single split resolves most investigations.",
          "If impressions fell and average position held, demand fell. This is seasonality or a shift in how people phrase the query, and rewriting the page will not bring the traffic back.",
          "If position fell, you lost ranking. That is a competitive or quality question. If impressions and position held but clicks fell, you lost the click — a SERP feature, an AI overview, or a competitor with a better snippet is taking it."
        ],
        bullets: [
          "Impressions down, position flat → demand change.",
          "Position down → ranking loss.",
          "Position flat, CTR down → SERP or snippet change.",
          "Impressions to zero → indexability."
        ]
      },
      {
        heading: "Step 3: Rule out indexability before anything else",
        paragraphs: [
          "If a page went from steady impressions to near zero overnight, treat it as a technical failure until proven otherwise. Check for a noindex that was added in a bulk edit, a canonical now pointing at another URL, a robots.txt change, or a URL that moved without a redirect.",
          "This is the highest-value check in the whole process because the fix is small and the recovery is usually complete."
        ]
      },
      {
        heading: "Step 4: Check what changed on your side",
        paragraphs: [
          "Line the drop up against your own timeline: a theme change, a plugin update, a migration, a permalink change, a redesign that removed internal links, a CDN or hosting move.",
          "Internal link removal is the quiet one. A navigation redesign that drops a section link can orphan dozens of pages at once, and the ranking decay shows up weeks later, long after anyone connects it to the redesign."
        ]
      },
      {
        heading: "Step 5: Only then look at the content",
        paragraphs: [
          "If demand is stable, the page is indexable, nothing changed on your side, and position genuinely fell, the content question is finally the right question.",
          "Even here, the response is rarely a full rewrite. Look at what now ranks above you and what the query is actually asking for. The gap is usually specific: a missing section, an outdated figure, a format mismatch."
        ]
      },
      {
        heading: "Keeping the diagnosis attached to the work",
        paragraphs: [
          "The failure mode of this process is that the diagnosis lives in someone's head or in a Slack thread, and the task that reaches the editor says only 'update this post.'",
          "Whatever tooling you use, the record that reaches the person doing the work needs the URL, the observed change, which of the five causes you concluded, and what specifically to do. Without that, the next person re-runs the whole investigation."
        ]
      }
    ],
    faq: [
      {
        question: "How long should I wait before reacting to a traffic drop?",
        answer:
          "Give it a full week of stable data unless impressions went to zero. A zero-impression page is a technical failure and should be investigated immediately."
      },
      {
        question: "Can a Google core update cause this?",
        answer:
          "Yes, and it shows up as a position drop across many pages at once, aligned to a known update date. That is a quality and intent-match question, not a per-page bug."
      },
      {
        question: "Why did clicks fall while impressions rose?",
        answer:
          "You are ranking for more queries but converting fewer of them, typically because you moved into positions 8-20 on broader terms, or a SERP feature is absorbing the click above you."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "seo-backlog-prioritization"]
  },
  {
    slug: "orphan-pages-wordpress",
    category: "Internal linking",
    title: "How to find orphan pages in WordPress and decide what to do with them",
    metaTitle: "Find Orphan Pages in WordPress (and Fix Them)",
    metaDescription:
      "Orphan pages have no inbound internal links, so they get almost no internal authority. How to find them in WordPress and choose between linking, merging, and removing.",
    summary:
      "An orphan page is reachable by sitemap and nothing else. Finding them is mechanical; deciding what each one deserves is not.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "5 min read",
    intro: [
      "An orphan page has no inbound internal links from anywhere on your site. It may sit in the sitemap, it may be indexed, and it will still behave like a page nobody vouched for — because structurally, nobody did.",
      "On a WordPress site that has been publishing for a few years, orphans accumulate quietly: posts that fell off the archive, landing pages built for a campaign that ended, pages whose linking hub was removed in a redesign."
    ],
    sections: [
      {
        heading: "Why orphan pages underperform",
        paragraphs: [
          "Internal links do two things. They pass authority, and they tell the search engine what a page is about through anchor text and surrounding context. An orphan gets neither.",
          "It also gets crawled less. Discovery through a sitemap alone signals low importance, and crawl frequency follows that signal down."
        ]
      },
      {
        heading: "The near-orphan problem",
        paragraphs: [
          "Pages with exactly one inbound internal link are usually worse than they look, because that one link is almost always from a paginated archive. As the archive fills, the page moves to page four, then page nine, and the link effectively disappears.",
          "Audit for one-link pages alongside true orphans. The remediation is the same and the decay is more predictable."
        ]
      },
      {
        heading: "Finding them without a crawler",
        paragraphs: [
          "External crawlers find orphans by comparing a crawl against a sitemap, which requires a paid tool and a full crawl budget. Inside WordPress you have a shortcut: the content is already in the database, so inbound internal links can be counted directly from post content.",
          "The free Content Signal plugin does exactly this — it identifies content with no inbound internal links and content with only one, locally, with no external request and no URL quota."
        ]
      },
      {
        heading: "Deciding what each orphan deserves",
        paragraphs: [
          "Not every orphan should be rescued. Sort the list by impressions before you decide anything.",
          "An orphan with impressions is an opportunity: it is ranking despite having no internal support, so linking to it from two or three relevant pages is one of the highest-return edits available. An orphan with no impressions and no strategic purpose is a candidate for merging or removal."
        ],
        bullets: [
          "Has impressions and a clear purpose → add 2-3 contextual internal links from related pages.",
          "No impressions, overlaps another page → merge the useful part and redirect.",
          "No impressions, no purpose, no backlinks → remove and let it 410, or redirect to the closest parent.",
          "Intentionally unlinked (a campaign landing page, a legal page) → mark it as ignored so it stops surfacing."
        ]
      },
      {
        heading: "Linking well, not just linking",
        paragraphs: [
          "A link from a footer or a 'related posts' widget barely counts. The link that matters is a contextual one inside body copy, with anchor text that describes the destination.",
          "Two good contextual links beat twenty template links. Choose source pages that are topically adjacent and that already have some authority of their own."
        ]
      }
    ],
    faq: [
      {
        question: "Do orphan pages hurt the rest of my site?",
        answer:
          "Not directly. They waste crawl budget and underperform themselves, but they do not penalize other pages. The cost is opportunity, not punishment."
      },
      {
        question: "Does a sitemap entry fix an orphan page?",
        answer:
          "It fixes discovery, not authority or context. The page can be found and indexed while still receiving no internal ranking signal."
      },
      {
        question: "Are pages linked only from the menu still orphans?",
        answer:
          "No, but a navigation link is weak. If the page needs to rank, it also needs contextual links from related body content."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "seo-backlog-prioritization"]
  },
  {
    slug: "seo-backlog-prioritization",
    category: "Workflow design",
    title: "Turning an SEO audit into a backlog people actually work through",
    metaTitle: "SEO Backlog Prioritization: From Audit to Shipped Work",
    metaDescription:
      "An SEO audit export is not a backlog. How to score findings by impact and effort, keep the evidence attached, and get changes reviewed and shipped.",
    summary:
      "The gap between an audit and improved rankings is a handoff problem. The record that reaches the editor has to carry the evidence with it.",
    published: "2026-08-31",
    updated: "2026-08-31",
    readingTime: "6 min read",
    intro: [
      "Every SEO team has a CSV somewhere with 400 findings in it. Almost none of those findings became a shipped change, and the reason is structural rather than motivational.",
      "A finding is an observation. A backlog item is a decision with an owner. Converting one into the other is the step most workflows skip."
    ],
    sections: [
      {
        heading: "Score on impact and effort, not severity",
        paragraphs: [
          "Audit tools emit severity labels, and severity is close to useless for sequencing because it describes the rule that fired, not the value of fixing it. A 'critical' missing meta description on a page with four impressions is worth less than a 'medium' thin-content flag on a page with 4,000.",
          "Rescore everything against two axes: estimated traffic impact, drawn from actual impressions and position, and effort, drawn from what the change actually requires."
        ],
        bullets: [
          "High impact, low effort → do this week. Titles and descriptions on high-impression pages, noindex removals, internal links to ranking orphans.",
          "High impact, high effort → plan for the quarter. Consolidations, rewrites, structural changes.",
          "Low impact, low effort → batch it, or ignore it deliberately.",
          "Low impact, high effort → close it and say why."
        ]
      },
      {
        heading: "Keep the evidence attached to the task",
        paragraphs: [
          "The single most common failure is a task titled 'improve the pricing page.' The editor who picks it up has no idea which query it was about, what the observed change was, or what success looks like.",
          "A backlog item should carry the URL, the source signal that produced it, the observed metric change, the recommended action, the owner, and the state. If any of those live in a different tool, the handoff will lose them."
        ]
      },
      {
        heading: "Make 'no action' a real outcome",
        paragraphs: [
          "Findings that are intentional — a deliberately noindexed page, a canonical that is correct, a short page that is meant to be short — must be closeable with a reason, and they must stay closed on the next scan.",
          "Without that, every re-run resurfaces the same fifty non-issues and the team stops reading the report. An ignore mechanism with a restore path is what keeps a recurring audit trustworthy."
        ]
      },
      {
        heading: "Review before anything writes to the site",
        paragraphs: [
          "Automated SEO changes fail on trust rather than capability. A tool that can bulk-rewrite metadata is only usable if someone can see exactly what will change before it changes.",
          "That means a bounded preview of the specific fields, a dry run, an explicit confirmation, a record of the previous values, and an activity history. The chain is not ceremony — it is what makes the automation safe enough to actually turn on."
        ]
      },
      {
        heading: "Measure resolved work, not audits run",
        paragraphs: [
          "Counting audits or connected sites measures setup. Counting high-impact tasks resolved per week measures whether the workflow is doing anything.",
          "It is also the number that exposes a broken handoff fastest. If audits run weekly and resolved tasks stay near zero, the problem is the backlog, not the scanning."
        ]
      }
    ],
    faq: [
      {
        question: "Should SEO tasks live in Jira or in an SEO tool?",
        answer:
          "Wherever the evidence survives. A tracker works if the URL, signal, and metric travel with the ticket; it fails when the ticket is a one-line title and the context stays in a dashboard."
      },
      {
        question: "How many SEO tasks should a team take on per week?",
        answer:
          "Fewer than the audit produces. Pick the top slice by impact-over-effort and close the rest explicitly, so the backlog reflects decisions instead of accumulating."
      },
      {
        question: "Is automated SEO metadata editing safe?",
        answer:
          "It is safe when it is review-first: bounded scope, a preview of the exact change, explicit confirmation, retained previous values, and an audit trail. Unattended bulk writes are not."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "search-console-traffic-drop"]
  }
];

export function findBriefing(slug: string): Briefing | undefined {
  return briefings.find((briefing) => briefing.slug === slug);
}
