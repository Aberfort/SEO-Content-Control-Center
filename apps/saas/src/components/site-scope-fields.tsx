"use client";

import { useId, useState } from "react";

import type { Site } from "@/lib/types";

type SiteScopeFieldsProps = {
  sites: Site[];
  defaultSiteIds?: string[];
  label?: string;
};

export function SiteScopeFields({
  sites,
  defaultSiteIds = [],
  label = "Site access"
}: SiteScopeFieldsProps) {
  const groupId = useId();
  const [restricted, setRestricted] = useState(defaultSiteIds.length > 0);

  if (sites.length === 0) {
    return null;
  }

  return (
    <fieldset className="site-scope-fields">
      <legend>{label}</legend>
      <label className="site-scope-option">
        <input
          checked={!restricted}
          name={`${groupId}-mode`}
          onChange={() => setRestricted(false)}
          type="radio"
        />
        <span>Full organization access</span>
      </label>
      <label className="site-scope-option">
        <input
          checked={restricted}
          name={`${groupId}-mode`}
          onChange={() => setRestricted(true)}
          type="radio"
        />
        <span>Only selected sites</span>
      </label>

      {restricted ? (
        <div className="site-scope-list">
          {sites.map((site) => (
            <label className="site-scope-item" key={site.id}>
              <input
                defaultChecked={defaultSiteIds.includes(site.id)}
                name="siteIds"
                type="checkbox"
                value={site.id}
              />
              <span>{site.name}</span>
            </label>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
