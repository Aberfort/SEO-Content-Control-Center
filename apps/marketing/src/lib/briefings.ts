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
  /**
   * Shows a one-line note pointing to the free single-URL page checker,
   * for posts about a symptom that tool actually catches (noindex, missing
   * metadata, thin content). Omit for posts where a one-page check isn't
   * the relevant next action.
   */
  checkerCta?: boolean;
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
    related: [
      "accidentally-noindexed-wordpress-content",
      "search-console-traffic-drop",
      "orphan-pages-wordpress"
    ],
    checkerCta: true
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
      },
      {
        question: "Do Yoast or Rank Math already find orphan pages?",
        answer:
          "Rank Math Pro's Link Assistant can flag posts with no internal links pointing to them. Yoast Premium's internal linking suggestions tool covers similar ground. Both are premium features scoped to their own plugin's data; a WordPress-native local audit works either alongside them or as a free option if you're not on a paid tier of either."
      }
    ],
    related: [
      "wordpress-seo-audit-checklist",
      "seo-backlog-prioritization",
      "wordpress-seo-audit-without-screaming-frog"
    ]
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
    related: ["yoast-seo-audit-alternative", "wordpress-seo-audit-checklist", "agency-multi-site-seo-backlog"]
  },
  {
    slug: "yoast-rank-math-together",
    category: "Plugins",
    title: "Can you run Yoast and Rank Math together on WordPress?",
    metaTitle: "Yoast and Rank Math Together: What Really Happens",
    metaDescription:
      "Running Yoast and Rank Math at once causes duplicate meta tags and schema. Here's what actually conflicts, and what can safely run alongside either one.",
    summary:
      "Running two full SEO plugins at once causes real, well-documented conflicts. A tool that reads existing metadata instead of managing it is a different thing entirely, and the difference is worth knowing before you assume both cause the same problem.",
    published: "2026-09-06",
    updated: "2026-09-06",
    readingTime: "5 min read",
    intro: [
      "Every comparison of Yoast and Rank Math frames the decision as pick one, then migrate away from the other. That advice is correct, but it answers a narrower question than the one people are actually asking when they search for this. The real question is usually: does anything else break if I add a second tool on top of whichever one I already have?",
      "Those are two different claims. The first is well established. The second depends entirely on what the second tool actually does."
    ],
    sections: [
      {
        heading: "What actually breaks when two SEO plugins run at once",
        paragraphs: [
          "Yoast and Rank Math both hook into the same handful of places: the document head, the XML sitemap endpoint, the redirect layer, and the post-edit meta box. When both are active, both try to own them.",
          "The visible symptom is usually duplicate or conflicting output — two sets of title and meta description tags competing for the same page, two Article or Organization schema blocks in the markup, or two XML sitemaps at different URLs with different page counts. Which plugin's version actually wins often comes down to hook priority and load order, not anything you configured on purpose."
        ],
        bullets: [
          "Duplicate title/meta description tags in the rendered head",
          "Conflicting or duplicated JSON-LD schema blocks",
          "Two redirect managers intercepting the same 404s",
          "Two XML sitemaps submitted at different URLs"
        ]
      },
      {
        heading: "Why disabling overlapping modules doesn't fully fix it",
        paragraphs: [
          "Both plugins let you turn off individual modules — Rank Math's redirection module, Yoast's XML sitemap, and so on. That narrows the damage but doesn't remove it: whichever plugin stays active still adds its own meta box to every post-edit screen, so an editor sees two SEO panels and has no reliable way to know which one is actually live for that field.",
          "This is a workflow problem as much as a technical one. The fix that actually holds is running one plugin for the whole site, not two plugins with most of one turned off."
        ]
      },
      {
        heading: "If you're migrating from one to the other",
        paragraphs: [
          "Rank Math ships a built-in importer that reads Yoast's stored data, including redirects, so most migrations don't mean starting from zero. Run the importer, then spot-check a sample of pages against the original Yoast values before you deactivate Yoast.",
          "Once you've verified the import, deactivate the old plugin fully rather than leaving it installed-but-inactive indefinitely. A deactivated plugin doesn't execute, but an ambiguous half-migrated state invites exactly the meta-box confusion described above for as long as both stay installed."
        ]
      },
      {
        heading: "What can actually sit alongside either one",
        paragraphs: [
          "The conflicts above all come from two tools trying to own the same fields. A tool that only reads whichever plugin's fields are already populated, and writes back to those same fields through an explicit, reviewed step instead of registering its own competing meta box, doesn't create the same collision — there's still exactly one place the title and meta description live.",
          "That's the distinction worth checking for, whatever tool you're evaluating: does it add a second, parallel set of SEO fields, or does it operate on the one set that Yoast or Rank Math already owns?"
        ]
      },
      {
        heading: "Where this shows up in an audit workflow",
        paragraphs: [
          "Content Signal's local WordPress audit reads whichever plugin's title, meta description, and canonical fields are actually set, with the other left as a documented fallback, and never installs a second competing meta box. When a supported fix is available, it proposes a change to the same field through a preview and explicit confirmation, rather than owning it outright.",
          "That's a narrower promise than \"works with everything,\" and it's the one that avoids the problem the rest of this guide is about."
        ]
      }
    ],
    faq: [
      {
        question: "Should I ever run two full SEO plugins on the same site?",
        answer:
          "No. Pick one to own titles, meta descriptions, canonicals, sitemaps, and schema for the whole site. Two plugins reading or writing those same fields produce duplicate tags and unpredictable output order."
      },
      {
        question: "Can Content Signal replace Yoast or Rank Math?",
        answer:
          "No. It isn't a metadata plugin. It reads whichever one is installed and proposes bounded, reviewed changes back through the same fields instead of owning them itself."
      },
      {
        question: "Does adding an audit layer change my existing Yoast or Rank Math data?",
        answer:
          "Not on its own. A read-only audit only inspects the fields that are already there, and any supported write still requires an explicit, separate confirmation."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "seo-backlog-prioritization"]
  },
  {
    slug: "agency-multi-site-seo-backlog",
    category: "Agencies",
    title: "Running one SEO backlog across every client site",
    metaTitle: "Running One SEO Backlog Across Every Client Site",
    metaDescription:
      "Managing SEO across client sites usually means N spreadsheets and whichever client shouts loudest. Here's how to run one shared, prioritized backlog instead.",
    summary:
      "Impact-over-effort scoring works inside one site. Across a client portfolio, the harder problem is capacity: whose work gets done this week, and on what basis.",
    published: "2026-09-06",
    updated: "2026-09-06",
    readingTime: "6 min read",
    intro: [
      "A single-site SEO backlog has one failure mode: findings that never become tasks. A multi-client one has a second failure mode layered on top of the first, and it's the one that actually burns agency capacity: whichever client emails the most, or has the most senior contact, absorbs the week, while a quieter account's page losing 40% of its clicks sits untouched.",
      "The scoring mechanics for turning a finding into a task don't change across clients. What changes is the queue that scoring feeds, and whether it's one queue or a dozen disconnected ones."
    ],
    sections: [
      {
        heading: "The default is a spreadsheet per client, and it's the problem",
        paragraphs: [
          "Most agencies end up with one tracker per client because that's how the client relationship is scoped: separate contracts, separate reporting, separate Slack channels. It feels natural to keep the work separate too.",
          "The cost shows up at the team level, not the client level. A strategist covering eight accounts can't compare a Client A page down 40% against a Client C thin-content flag without opening eight tools. So the comparison doesn't happen, and capacity gets allocated by who asked most recently instead of by what actually matters."
        ]
      },
      {
        heading: "Score across the whole portfolio, not per client",
        paragraphs: [
          "The impact-over-effort framework for turning findings into tasks doesn't need to change for agency work. What needs to change is its scope: run it across every connected site at once, not once per client, so a genuinely high-impact page surfaces near the top of the queue regardless of which client it belongs to.",
          "That doesn't mean every client's work competes in one undifferentiated pile forever. It means the default view is the honest one — ranked by impact and effort across the portfolio — and client-level filtering is a lens on top of it, not the only way to see the work."
        ]
      },
      {
        heading: "Decide the capacity model on purpose",
        paragraphs: [
          "Two approaches both work, and the failure is not picking either one deliberately. Pure impact ranking sends capacity to whichever client's pages are losing the most traffic this month, which is efficient but can starve a smaller retainer for weeks at a stretch. A capacity floor per client — a guaranteed minimum slice of hours regardless of ranking — protects every relationship but blunts the portfolio-level prioritization that made a shared queue worth building in the first place.",
          "Most agencies land somewhere between the two: a small guaranteed floor per client, with everything above it ranked by impact across the whole book. The specific split matters less than making the decision visible instead of letting it default to whoever complained most recently."
        ]
      },
      {
        heading: "Reporting is a byproduct, not a second job",
        paragraphs: [
          "If the backlog and the client report live in different places, someone rebuilds the report by hand every cycle, which is exactly the kind of manual step that gets skipped under deadline pressure. A report generated from the same evidence and outcome data the backlog already tracks — found, prioritized, fixed, verified — stays accurate because there's no second copy to fall out of sync.",
          "Content Signal's site- and workspace-level HTML and CSV client reports are built from that same evidence trail, not a separate export someone maintains by hand."
        ]
      },
      {
        heading: "What this doesn't solve yet",
        paragraphs: [
          "One honest limit worth stating: roles apply at the organization level today, not per site. A team member with backlog access can see every connected site in that organization. If a subcontractor needs to be scoped to exactly one client and nothing else, the current workaround is a separate organization for that client, not a role you can assign inside a shared one.",
          "Site-level role scoping is on the roadmap, not shipped. Worth knowing before you build a workflow that assumes it exists."
        ]
      }
    ],
    faq: [
      {
        question: "Should each client have a separate backlog?",
        answer:
          "Keep one shared, portfolio-wide queue as the default view, with client-level filtering on top of it. A backlog per client recreates the comparison problem this whole approach is meant to solve."
      },
      {
        question: "How do you stop one loud client from eating all your team's capacity?",
        answer:
          "Decide the capacity model on purpose — a small guaranteed floor per client with everything above it ranked by impact across the portfolio is a common middle ground. The failure mode is not choosing, not which model you pick."
      },
      {
        question: "Can clients see their own backlog without a platform login?",
        answer:
          "Not as a no-login portal today. Site- and workspace-level HTML or CSV reports can be generated and sent to a client from the same evidence the backlog tracks."
      },
      {
        question: "Can I scope a team member to just one client's site?",
        answer:
          "Not yet as a role scoped to a single site — roles apply across the whole organization today. The current workaround is a separate organization per client that needs that isolation."
      }
    ],
    related: ["seo-backlog-prioritization", "wordpress-seo-audit-checklist"]
  },
  {
    slug: "accidentally-noindexed-wordpress-content",
    category: "Indexability",
    title: "How to find every accidentally noindexed page on a WordPress site",
    metaTitle: "Find Accidentally Noindexed Pages in WordPress",
    metaDescription:
      "A noindex directive on a published page is invisible in normal browsing. Where it actually comes from, how to check one URL, and how to find every one.",
    summary:
      "Noindex is a single word in a meta tag or an HTTP header, and nothing about a normal page view shows you it's there. Here's where it actually comes from and how to find every instance, not just the one you already suspect.",
    published: "2026-09-10",
    updated: "2026-09-10",
    readingTime: "5 min read",
    intro: [
      "A page can be published, linked from your navigation, and still carry a directive telling search engines to skip it entirely. Nothing in the WordPress editor flags this. The post looks exactly like every other published post.",
      "This isn't rare. It's the most common way a site loses pages from Google without anyone noticing until traffic on that page quietly goes to zero."
    ],
    sections: [
      {
        heading: "The three places noindex actually comes from",
        paragraphs: [
          "Noindex reaches a page through one of three unrelated mechanisms, and knowing which one you're dealing with changes where you look.",
          "The most common is WordPress's own site-wide setting: Settings → Reading → \"Discourage search engines from indexing this site.\" It's meant for a site still in development, and it adds a noindex directive to every page's <head> until someone unchecks it — which is easy to forget after a staging-to-production launch.",
          "The second is a per-post toggle in whichever SEO plugin is active — Yoast's \"Allow search engines to show this Post in search results?\" or Rank Math's equivalent robots-meta control. Set intentionally on one post, it's usually fine. Set by a bulk-edit action, an import script that carried a default value, or a copy-paste from a template post, it silently spreads.",
          "The third is easy to miss entirely: an X-Robots-Tag HTTP response header, set at the server or CDN layer rather than in WordPress at all. It never appears in the page source, and most SEO plugins have no way to see it because they only control what WordPress renders into the page. It's a common leftover from a staging environment's blanket noindex rule that didn't get removed at launch."
        ]
      },
      {
        heading: "Checking one URL",
        paragraphs: [
          "For the first two mechanisms, view the page source and search for <meta name=\"robots\">. If it contains noindex, that's your answer, and it tells you nothing about which of the two settings caused it — you'd still need to check Settings → Reading and the post's own SEO panel.",
          "The X-Robots-Tag header won't show up there at all, since it's a response header, not markup. Content Signal's free page checker reads both in one fetch — the meta tag and the response header — and tells you which one is actually blocking the page, since they call for different fixes."
        ]
      },
      {
        heading: "Why Search Console's URL Inspection isn't the same check",
        paragraphs: [
          "Google Search Console's Live Test reflects what Google's crawler saw the last time it visited, which can lag the page's current state by days. If you just fixed a noindex tag, Search Console may still show the old, blocked result until the next crawl.",
          "Checking the live page directly tells you what's being served right now. Both views matter — one tells you what's true today, the other tells you what Google currently believes."
        ]
      },
      {
        heading: "Why checking pages one at a time doesn't scale",
        paragraphs: [
          "A single bulk-edit action, a theme migration, or a plugin update with a changed default can noindex dozens of posts in one step, and there's no notification when it happens. The only way to know is to check — and checking a few hundred published posts one URL at a time isn't something anyone actually does on a recurring basis."
        ],
        bullets: [
          "A staging clone pushed to production with \"Discourage search engines\" still checked.",
          "A bulk-edit action applied to the wrong filtered view of posts.",
          "An SEO plugin migration that reset per-post robots settings to a new default.",
          "A CDN rule written for a maintenance window that never got removed."
        ]
      },
      {
        heading: "What the free plugin adds",
        paragraphs: [
          "The free Content Signal WordPress plugin scans every published post and page locally, no account or external request, and flags every one where the SEO metadata contains a noindex directive on content that's supposed to be public. It compares each scan against the previous one, so a newly introduced noindex shows up as a new finding instead of disappearing into a static list.",
          "It reads the same per-post and site-wide settings the plugin-toggle and site-wide checkbox mechanisms control — it doesn't fetch each page's HTTP headers, since that would require an external request the local audit deliberately avoids. That's exactly the gap the page checker's server-header check fills for a single URL you already suspect."
        ]
      }
    ],
    faq: [
      {
        question: "If I fix a noindex tag, does the page come back to Google immediately?",
        answer:
          "No. Removing the directive only makes the page eligible for indexing again — Google still needs to recrawl it. Request indexing for the specific URL in Search Console to speed that up rather than waiting for the next scheduled crawl."
      },
      {
        question: "Can a page be noindexed for some search engines and not others?",
        answer:
          "Only through robots.txt rules scoped to a specific crawler's user-agent. A meta robots or X-Robots-Tag noindex directive applies to every compliant crawler that reads it — there's no per-engine version of that mechanism."
      },
      {
        question: "Does the site-wide \"Discourage search engines\" checkbox noindex pages retroactively, or only going forward?",
        answer:
          "It's not retroactive in the sense of deleting anything — it's a live setting that adds the noindex directive to every page render for as long as it stays checked. Unchecking it removes the directive from the very next page load; no historical cleanup is needed."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "wordpress-canonical-tag-wrong", "orphan-pages-wordpress"],
    checkerCta: true
  },
  {
    slug: "wordpress-pages-missing-meta-description",
    category: "Metadata",
    title: "How to find every WordPress page missing a meta description",
    metaTitle: "Find WordPress Pages Missing a Meta Description",
    metaDescription:
      "A missing meta description hands Google full control of your search snippet. How to check one URL, and how to find every page across a site that's missing one.",
    summary:
      "Every page without a written meta description gets a snippet Google assembles on its own, usually the first sentences it finds. Here's how to check one page, and why that check needs to run across the whole site, not one URL at a time.",
    published: "2026-09-10",
    updated: "2026-09-10",
    readingTime: "4 min read",
    intro: [
      "A meta description doesn't affect ranking directly. It affects whether the person who already found your result in the SERP decides to click it — and when it's missing, you hand that decision entirely to an algorithm assembling a snippet from whatever text it finds first.",
      "On most WordPress sites this isn't one or two forgotten posts. It's whatever fraction of the archive was published before someone started filling the field in consistently, plus every new post from a contributor who doesn't know the field exists."
    ],
    sections: [
      {
        heading: "What actually happens when it's missing",
        paragraphs: [
          "Google generates a snippet from page content it judges most relevant to the query — sometimes the opening paragraph, sometimes a sentence from further down the page, sometimes a mix. It's frequently serviceable and occasionally an out-of-context fragment that undersells the page.",
          "The difference matters most on pages that already rank. A written description doesn't change position, but it changes the pitch a searcher reads before clicking, which is the entire lever a static meta description controls."
        ]
      },
      {
        heading: "Checking one URL",
        paragraphs: [
          "View the page source and look for <meta name=\"description\">. If the tag is absent, or its content attribute is empty, there's nothing for Google to prefer over its own extraction.",
          "Content Signal's free page checker does this same read in one fetch, and also flags a description that's technically present but too short or long enough to truncate in results — a present-but-unusable description is a different problem from a missing one, worth distinguishing."
        ]
      },
      {
        heading: "Where the gaps concentrate",
        paragraphs: [
          "On sites that adopted an SEO plugin partway through their history, the gap usually isn't random — it clusters in the oldest content, published before the field became part of the publishing habit.",
          "It also clusters around custom post types. WooCommerce products, portfolio items, and other non-standard content types are easy for an SEO plugin's default template to miss unless someone explicitly configured a fallback pattern for that type."
        ],
        bullets: [
          "Sort candidates by impressions, not by publish date — a five-year-old post with real search visibility is worth ten minutes; a five-year-old post with none isn't.",
          "Check custom post types separately from posts and pages; they're the most commonly overlooked category.",
          "Prioritize pages ranking outside the top 3, where snippet quality has the most influence on whether a searcher scrolls past a stronger-looking competitor."
        ]
      },
      {
        heading: "Finding every instance across a site",
        paragraphs: [
          "A one-URL check answers the question for a page you already suspect. It doesn't tell you how many others share the problem, and manually opening view-source on a few hundred posts isn't a workflow anyone sustains.",
          "The free Content Signal WordPress plugin scans every published post, page, and custom post type locally and flags each one with an empty or missing meta description field, alongside the rest of the content-health picture — no account, no external request, no per-URL manual check."
        ]
      }
    ],
    faq: [
      {
        question: "Does writing a meta description improve ranking?",
        answer:
          "Not directly — it isn't a ranking signal Google's algorithm scores. Its effect is on click-through rate for a page that's already visible in results, which is a real but separate lever from ranking position."
      },
      {
        question: "Will Google always use the meta description I write?",
        answer:
          "No. Google rewrites descriptions for a large share of results when it judges a different snippet better matches the specific query. Writing one improves your odds on stable, high-intent queries; it doesn't guarantee the snippet you see in preview."
      },
      {
        question: "Is there an ideal meta description length?",
        answer:
          "Aim for roughly 120-158 characters. Shorter wastes available space; longer risks truncation, which usually cuts the sentence mid-thought rather than at a natural break."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "accidentally-noindexed-wordpress-content", "seo-backlog-prioritization"],
    checkerCta: true
  },
  {
    slug: "wordpress-canonical-tag-wrong",
    category: "Metadata",
    title: "How to check whether a WordPress canonical tag points to the wrong URL",
    metaTitle: "Check a WordPress Canonical Tag for Errors",
    metaDescription:
      "A canonical tag pointing at the wrong URL tells Google to rank a different page instead. How to check a single URL and find every conflict across a site.",
    summary:
      "A canonical tag is a direct instruction: index this other URL instead of the one you're looking at. Correct for real duplicates, and quietly self-defeating everywhere else. Here's how to check one page and how conflicts spread across a site.",
    published: "2026-09-10",
    updated: "2026-09-10",
    readingTime: "5 min read",
    intro: [
      "A canonical tag tells Google which URL should be treated as the authoritative version when the same or similar content is reachable at more than one address. Google generally respects it, which is exactly why a wrong one is dangerous — it's not a suggestion Google occasionally ignores, it's an instruction it usually follows.",
      "Most canonical problems aren't intentional. They're a side effect of a migration, a theme change, or a plugin setting nobody revisited after it did its job once."
    ],
    sections: [
      {
        heading: "What a wrong canonical actually does",
        paragraphs: [
          "When Page A's canonical points to Page B, Google consolidates ranking signals toward B and generally won't show A in results, even if A is the version you actually want visible. If B doesn't exist, has been redirected elsewhere, or is a weaker page, you've effectively asked Google to stop ranking your good page in favor of a broken or worse one.",
          "This is correct behavior for genuine duplicates — a printer-friendly version, a tracking-parameter variant, a paginated comment page. It's actively harmful anywhere else."
        ]
      },
      {
        heading: "The three patterns that show up most often",
        paragraphs: [
          "A stale canonical survives a URL change. The post's slug changed, or the site moved to a new domain, but the canonical tag still points at the old address — sometimes one that now 404s.",
          "A cross-domain canonical survives a staging-to-production launch. A canonical set to point at a staging or preview host during development never gets updated, and production content quietly tells Google to rank the staging copy instead.",
          "A plugin or theme default applies a canonical pattern nobody chose deliberately — some SEO plugins offer a bulk canonical rule for a post type or taxonomy that made sense for one section and gets silently inherited somewhere it shouldn't."
        ]
      },
      {
        heading: "Checking one URL",
        paragraphs: [
          "View source and look for <link rel=\"canonical\">. Compare the href value against the page's own address, accounting for protocol (http vs https) and trailing slashes, which can look like a mismatch and not actually be one.",
          "A canonical that matches the page's own URL is self-referencing and almost always correct — it's the deliberate default most SEO plugins set automatically. The ones worth investigating point somewhere else entirely."
        ]
      },
      {
        heading: "Finding conflicts across a whole site",
        paragraphs: [
          "A migration or plugin change rarely affects one URL. It tends to touch every post in a category, a whole custom post type, or every page published before a specific date — which means a single stale canonical you find by hand is usually a symptom of a pattern, not an isolated mistake.",
          "The free Content Signal WordPress plugin flags every published page whose canonical points somewhere other than itself, locally and in bounded background batches, so a pattern shows up as a cluster of findings instead of one report you happened to notice."
        ],
        bullets: [
          "Cross-domain canonicals get priority — they're the most likely to be pointing at a dead or wrong host entirely.",
          "Group findings by the date they were likely introduced; a cluster around one migration date confirms the root cause.",
          "Fix the source (the migration script, the plugin default) alongside the individual pages, or the pattern reappears on the next import."
        ]
      }
    ],
    faq: [
      {
        question: "Does every page need an explicit canonical tag?",
        answer:
          "Not strictly — Google can infer a self-canonical when none is present. Most SEO plugins set one automatically for exactly this reason, and it's a cheap, low-risk default rather than a requirement."
      },
      {
        question: "Will Google always obey a canonical tag?",
        answer:
          "Usually, but not unconditionally — it's treated as a strong signal, not an absolute directive. Google can choose a different canonical if other signals (like the actual backlink pattern) strongly disagree, but that's the exception, not something to rely on as a safety net."
      },
      {
        question: "Can a canonical pointing at a 404 hurt more than a missing canonical?",
        answer:
          "Yes. A missing canonical defaults to self-referencing behavior. A canonical pointing at a dead URL can suppress the working page without a working alternative for Google to consolidate toward — closer to accidentally deindexing the page."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "accidentally-noindexed-wordpress-content", "orphan-pages-wordpress"],
    checkerCta: true
  },
  {
    slug: "wordpress-thin-content-how-to-find",
    category: "Content quality",
    title: "How to find thin content on a WordPress site before it costs you rankings",
    metaTitle: "Find Thin Content on a WordPress Site",
    metaDescription:
      "Word count isn't a ranking factor, but it's a reliable proxy for whether a page can compete. How to spot thin content on one page and across a whole site.",
    summary:
      "A page doesn't need to be long to rank, but an informational page competing against 1,200-word results at 150 words is competing on substance it doesn't have. Here's how to find those pages before they quietly stop showing up.",
    published: "2026-09-10",
    updated: "2026-09-10",
    readingTime: "5 min read",
    intro: [
      "Word count itself isn't something Google scores. Treating it as a proxy for substance is still useful, because a page that says less than the results it's competing against usually loses on merit, not on a technicality.",
      "Thin content accumulates the same way orphan pages do: a post written to fill a content calendar slot, a category page auto-generated with no unique framing, a page that used to be longer before a redesign trimmed it."
    ],
    sections: [
      {
        heading: "Why word count works as a proxy",
        paragraphs: [
          "An informational query usually has an implicit bar for what a complete answer covers. A 1,500-word competing result probably addresses several sub-questions a searcher has; a 150-word page on the same topic almost certainly doesn't, regardless of how well it's written.",
          "This doesn't mean longer always wins — a page that directly answers a narrow, specific query in 200 words can outperform a padded 2,000-word competitor. The floor exists for the broad, informational middle of most content, not for every query type."
        ]
      },
      {
        heading: "Checking one page",
        paragraphs: [
          "There's no view-source trick for word count the way there is for a meta tag — you're estimating from the visible body text. Content Signal's free page checker fetches the page once and returns an approximate count, useful as a quick sanity check against a rough floor of roughly 300 words for informational content.",
          "Treat that number as a signal to investigate, not a verdict. A 280-word page that fully answers a narrow question is fine. A 280-word page attempting a broad topic almost certainly isn't."
        ]
      },
      {
        heading: "The honest fix isn't always \"add more words\"",
        paragraphs: [
          "Padding a thin page with restated sentences doesn't fix the underlying problem — Google's language understanding isn't fooled by volume without substance, and readers notice immediately.",
          "Three real options exist for a genuinely thin page: expand it with content that actually adds coverage the topic needs, merge it into a stronger page that already covers the ground and redirect, or remove it if it serves no real purpose. Doing nothing is the only option that keeps the crawl cost without any of the benefit."
        ],
        bullets: [
          "Expand when the topic deserves standalone coverage and the gaps are addressable.",
          "Merge when a stronger page already covers the same ground — redirect the weaker one in.",
          "Remove when neither applies and the page has no search visibility to protect."
        ]
      },
      {
        heading: "Finding thin pages across a whole site",
        paragraphs: [
          "A handful of thin pages found by spot-checking rarely represents the real scope. Content produced in a batch — a burst of short news posts, an auto-generated set of location or category pages, an early-stage content calendar before editorial standards tightened — tends to be thin as a group.",
          "The free Content Signal WordPress plugin flags every published post and page under a configurable word-count floor, locally, across the whole site in bounded background batches, so the pattern is visible as a list instead of something you have to notice page by page."
        ]
      }
    ],
    faq: [
      {
        question: "Is there a universal minimum word count for good SEO?",
        answer:
          "No. A reasonable floor for competitive informational content sits around 300 words, but transactional, reference, and narrowly-scoped pages can rank well far below that. Treat any specific number as a screening heuristic, not a rule."
      },
      {
        question: "Can a page be too long?",
        answer:
          "Length itself doesn't penalize a page, but padding a thin topic to hit a word count usually produces worse content — repeated points, diluted keyword relevance, and a slower page. The goal is matching depth to what the topic actually needs."
      },
      {
        question: "Does thin content get penalized, or does it just fail to rank?",
        answer:
          "For most pages it's the latter — it simply loses to more complete competitors rather than triggering an explicit penalty. The exception is content thin enough to look auto-generated or purely duplicative, which can draw closer scrutiny under Google's broader content-quality systems."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "orphan-pages-wordpress", "seo-backlog-prioritization"],
    checkerCta: true
  },
  {
    slug: "wordpress-seo-audit-without-screaming-frog",
    category: "Comparisons",
    title: "Do you need Screaming Frog for a WordPress content audit?",
    metaTitle: "WordPress SEO Audit Without Screaming Frog",
    metaDescription:
      "Screaming Frog crawls a rendered site from the outside. A WordPress-native audit reads the database directly. When each approach is actually the right one.",
    summary:
      "Screaming Frog is a real, capable crawler that does things a WordPress-native audit can't. It's also not the right first tool for most single-site content audits, and knowing the difference saves a license and a learning curve.",
    published: "2026-09-10",
    updated: "2026-09-10",
    readingTime: "5 min read",
    intro: [
      "Screaming Frog SEO Spider is a desktop application that crawls a website the way a search engine does: it requests every page over HTTP, renders it, and follows every link it finds. That approach is genuinely necessary for some jobs and genuinely unnecessary for others, and a lot of WordPress site owners reach for it by default because it's the tool everyone recommends.",
      "For a single WordPress site where the question is \"which of my own posts have SEO metadata problems,\" a crawler is solving the problem the hard way. WordPress already knows every post's title, meta description, canonical, and robots setting — it's in the database. A crawler has to rediscover all of that from the outside, one HTTP request at a time."
    ],
    sections: [
      {
        heading: "What Screaming Frog actually does well",
        paragraphs: [
          "Screaming Frog is built for exactly the cases a database-level audit can't reach: sites it doesn't have backend access to, JavaScript-rendered content that needs real browser rendering to evaluate, log file analysis to see how search engines actually crawl a site, and large-scale technical audits spanning multiple systems, not just one WordPress install.",
          "Its free version is genuinely usable, not a crippled trial — it's capped at 500 URLs per crawl, with no time limit. The paid license (currently $279 per user per year) removes that cap and adds JavaScript rendering, scheduled crawls, and integrations with Search Console, Analytics, and Ahrefs."
        ]
      },
      {
        heading: "Where crawling is the wrong first step",
        paragraphs: [
          "A crawl budget is a real constraint even on the free tier — 500 URLs sounds like a lot until a mid-sized WordPress site's posts, pages, tags, categories, and paginated archives are all counted as separate crawled URLs. A site can exhaust that limit without a single blog post being scanned twice.",
          "A crawl also can't see anything WordPress hasn't rendered into the page. Whether a post is marked noindex through a plugin setting versus a site-wide checkbox looks identical from outside — the crawler sees the resulting meta tag either way, but can't tell you why it's there or which setting to go fix."
        ]
      },
      {
        heading: "What reading the database directly gets you instead",
        paragraphs: [
          "The free Content Signal WordPress plugin runs inside WordPress and reads post metadata directly — no crawl, no per-page HTTP request, no 500-URL ceiling. It scans every published post and page in bounded background batches, which is a fundamentally different resource profile than fetching each one over the network.",
          "The trade-off is scope: it only sees what's inside this one WordPress install. It has no view into a non-WordPress subdomain, a headless frontend, or how a page actually renders after client-side JavaScript runs — exactly the cases Screaming Frog is built for."
        ],
        bullets: [
          "One WordPress site, content-level questions (noindex, metadata, canonicals, thin content, orphan pages) → the free local audit; no crawl budget, no install, no license.",
          "Multiple systems, JavaScript-rendered content, log file analysis, or a technical crawl spanning more than WordPress → Screaming Frog is the right tool.",
          "Both, on a site that's grown complex → they're not mutually exclusive. A lot of teams run both and use each for what it's actually good at."
        ]
      }
    ],
    faq: [
      {
        question: "Is Screaming Frog's free version enough for a small WordPress site?",
        answer:
          "Often, yes — the 500-URL cap covers plenty of smaller sites. It's larger or more URL-dense sites (extensive tag/category archives, pagination, WooCommerce product variants) that hit the ceiling faster than expected."
      },
      {
        question: "Does a WordPress-native audit replace what Screaming Frog does?",
        answer:
          "No, and it isn't trying to. It replaces the crawl step for one specific job — content-level metadata problems on a single WordPress site — while leaving the genuinely different jobs (JS rendering, log analysis, multi-system crawls) to a real crawler."
      },
      {
        question: "Why would a local audit be faster than a crawl on the same site?",
        answer:
          "Because it isn't fetching anything over HTTP. Reading rows from WordPress's own database is orders of magnitude cheaper than requesting, downloading, and parsing each page's full HTML response one at a time."
      }
    ],
    related: ["wordpress-seo-audit-checklist", "orphan-pages-wordpress", "seo-backlog-prioritization"],
    checkerCta: true
  },
  {
    slug: "yoast-seo-audit-alternative",
    category: "Comparisons",
    title: "Looking for a Yoast SEO audit? Here's what Yoast checks, and what it doesn't",
    metaTitle: "Yoast SEO Audit: What It Checks, What It Doesn't",
    metaDescription:
      "Yoast analyzes one post at a time in the editor. Yoast's own guidance points elsewhere for a full-site audit. Here's the actual gap, and what fills it.",
    summary:
      "Yoast is genuinely good at what it's built for: per-post optimization while you write. It was never built to scan your whole published site at once, and Yoast's own content says as much. Here's the actual gap and how to close it.",
    published: "2026-09-10",
    updated: "2026-09-10",
    readingTime: "4 min read",
    intro: [
      "Yoast SEO's core feature is the analysis panel in the post editor: as you write, it checks the piece in front of you against readability and SEO best practices — title length, keyword usage, outbound links, and more. It's genuinely useful feedback, delivered at exactly the moment you can act on it.",
      "What it isn't built to do is look at every post you've already published and tell you which ones have problems right now. That's a different job, and Yoast's own published guidance agrees: its own SEO audit article recommends crawling your site with Screaming Frog or an all-in-one tool like Semrush or Ahrefs for that broader pass — not the Yoast plugin itself."
    ],
    sections: [
      {
        heading: "What Yoast is actually built for",
        paragraphs: [
          "The editor-time analysis is the product. It flags missing focus keyphrases, weak title or meta description length, readability issues, and internal-linking suggestions — all scoped to the single post you have open. Premium adds a few things that reach slightly wider, like orphaned-content suggestions in the internal linking tool, but the day-to-day surface is still per-post.",
          "None of that is a criticism — a writing-time checklist and a whole-site audit are different products solving different problems, and Yoast is a genuinely strong version of the first one."
        ]
      },
      {
        heading: "The actual gap: everything already published",
        paragraphs: [
          "The posts written before the editor panel existed, before someone was watching the score, or by a contributor who ignored it, don't get re-checked automatically. A site that's been publishing for a few years accumulates a real backlog of exactly the issues Yoast's editor would have caught in the moment — just never caught after the fact.",
          "That backlog needs a different kind of check: one that runs across everything already live, not one more piece of feedback for the next post you write."
        ]
      },
      {
        heading: "What closes the gap without replacing Yoast",
        paragraphs: [
          "The free Content Signal WordPress plugin runs a local audit across every published post and page — including the ones written years before anyone was watching an SEO score. It reads existing Yoast metadata rather than managing it, so nothing about how Yoast works day to day changes.",
          "It finds published content marked noindex, missing titles or descriptions, canonical conflicts, thin content, and orphan pages, then compares each scan against the last one so a newly introduced problem shows up as a new finding instead of disappearing into a static report."
        ],
        bullets: [
          "Keep Yoast doing what it does well: per-post guidance while writing.",
          "Add a whole-site scan for everything already published, including the years of content Yoast never re-checks on its own.",
          "Nothing about Yoast's own settings or metadata changes — the audit reads, it doesn't manage."
        ]
      }
    ],
    faq: [
      {
        question: "Does this turn off or replace Yoast's editor analysis?",
        answer:
          "No. Yoast's editor panel keeps working exactly as it does today. The local audit is a separate, whole-site pass that runs independently and reads the metadata Yoast already set."
      },
      {
        question: "Does Yoast Premium already do a full-site audit?",
        answer:
          "Not as a standalone audit dashboard. Premium adds internal-linking suggestions, including flagging some orphaned content, but the core analysis workflow is still centered on the post you're currently editing."
      },
      {
        question: "If I'm happy with Yoast, why would I need anything else?",
        answer:
          "You might not, if every post on the site was written and reviewed with the editor panel open. Most sites with real publishing history have at least some content that predates that habit — that's the gap a separate audit is for."
      }
    ],
    related: ["yoast-rank-math-together", "wordpress-seo-audit-checklist", "wordpress-seo-audit-without-screaming-frog"],
    checkerCta: true
  }
];

export function findBriefing(slug: string): Briefing | undefined {
  return briefings.find((briefing) => briefing.slug === slug);
}
