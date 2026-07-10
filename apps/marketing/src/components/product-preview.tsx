import { AlertTriangle, ArrowDownRight, CircleCheck, ListFilter, Search } from "lucide-react";

const backlog = [
  {
    page: "Best running shoes for flat feet",
    signal: "Clicks down 31%",
    issue: "CTR decline",
    impact: 18,
    tone: "high"
  },
  {
    page: "Standing desk review",
    signal: "8 competing queries",
    issue: "Thin coverage",
    impact: 13,
    tone: "medium"
  },
  {
    page: "Managed WordPress comparison",
    signal: "Title shared by 3 URLs",
    issue: "Duplicate title",
    impact: 9,
    tone: "low"
  }
];

export function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Product backlog preview">
      <div className="preview-rail" aria-hidden="true">
        <span className="preview-logo">SC</span>
        <span className="rail-dot active" />
        <span className="rail-dot" />
        <span className="rail-dot" />
        <span className="rail-dot" />
      </div>
      <div className="preview-main">
        <div className="preview-toolbar">
          <div>
            <span className="preview-kicker">Acme Publishing</span>
            <strong>SEO backlog</strong>
          </div>
          <div className="preview-search">
            <Search size={13} />
            Search tasks
          </div>
        </div>
        <div className="preview-metrics">
          <div>
            <span>High-impact tasks</span>
            <strong>24</strong>
            <small className="negative">
              <AlertTriangle size={12} /> 7 need review
            </small>
          </div>
          <div>
            <span>Clicks at risk</span>
            <strong>3.8k</strong>
            <small className="negative">
              <ArrowDownRight size={12} /> 18.4% vs prior period
            </small>
          </div>
          <div>
            <span>Resolved this week</span>
            <strong>11</strong>
            <small className="positive">
              <CircleCheck size={12} /> 6 verified
            </small>
          </div>
        </div>
        <div className="preview-table">
          <div className="preview-table-head">
            <span>Page and evidence</span>
            <span>Issue</span>
            <span>Impact</span>
            <span>Status</span>
            <ListFilter size={15} />
          </div>
          {backlog.map((row) => (
            <div className="preview-row" key={row.page}>
              <div>
                <strong>{row.page}</strong>
                <span>{row.signal}</span>
              </div>
              <span>{row.issue}</span>
              <span className={`impact impact-${row.tone}`}>+{row.impact}</span>
              <span className="status-pill">Open</span>
              <span className="row-menu">...</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
