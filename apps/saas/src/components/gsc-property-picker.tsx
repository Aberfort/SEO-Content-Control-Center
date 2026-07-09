"use client";

import { type FormEvent, useMemo, useState } from "react";

type GscPropertyPickerProps = {
  organizationId: string;
  siteId: string;
  currentPropertyUrl: string;
  returnHref: string;
};

type GscPropertyOption = {
  siteUrl: string;
  permissionLevel: string;
  selected: boolean;
};

type GscPropertyPayload = {
  data?: {
    connectedPropertyUrl: string;
    properties: GscPropertyOption[];
  };
  error?: {
    message?: string;
  };
};

export function GscPropertyPicker({
  organizationId,
  siteId,
  currentPropertyUrl,
  returnHref
}: GscPropertyPickerProps) {
  const [properties, setProperties] = useState<GscPropertyOption[]>([]);
  const [selectedPropertyUrl, setSelectedPropertyUrl] = useState(currentPropertyUrl);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const endpoint = useMemo(
    () =>
      `/api/organizations/${encodeURIComponent(organizationId)}/sites/${encodeURIComponent(
        siteId
      )}/gsc/properties`,
    [organizationId, siteId]
  );
  const hasLoadedProperties = properties.length > 0;

  async function loadProperties() {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(endpoint);
      const payload = (await response.json()) as GscPropertyPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message || "Could not load Search Console properties.");
      }

      setProperties(payload.data.properties);
      setSelectedPropertyUrl(payload.data.connectedPropertyUrl);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load Search Console properties."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function selectProperty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSelecting(true);
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          propertyUrl: selectedPropertyUrl
        })
      });
      const payload = (await response.json()) as GscPropertyPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message || "Could not select Search Console property.");
      }

      const url = new URL(returnHref, window.location.origin);
      url.searchParams.set("gsc", "property_selected");
      url.searchParams.delete("message");
      url.hash = "gsc-title";
      window.location.assign(`${url.pathname}${url.search}${url.hash}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not select Search Console property."
      );
      setIsSelecting(false);
    }
  }

  return (
    <div className="gsc-property-picker">
      <button
        className="secondary-button"
        type="button"
        onClick={loadProperties}
        disabled={isLoading}
      >
        {isLoading ? "Loading properties..." : "Load properties"}
      </button>
      {hasLoadedProperties ? (
        <form className="inline-form" onSubmit={selectProperty}>
          <label>
            <span>Property</span>
            <select
              name="propertyUrl"
              value={selectedPropertyUrl}
              onChange={(event) => setSelectedPropertyUrl(event.target.value)}
            >
              {properties.map((property) => (
                <option key={property.siteUrl} value={property.siteUrl}>
                  {property.siteUrl} ({formatPermission(property.permissionLevel)})
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" type="submit" disabled={isSelecting}>
            {isSelecting ? "Selecting..." : "Select property"}
          </button>
        </form>
      ) : null}
      {message ? <p className="form-error">{message}</p> : null}
    </div>
  );
}

function formatPermission(permissionLevel: string): string {
  return permissionLevel.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
