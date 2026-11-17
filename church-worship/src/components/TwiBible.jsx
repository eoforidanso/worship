import { useState } from "react";
import {
  isConnected,
  savedVersion,
  connect,
  disconnect,
  twiVersions,
  chooseVersion,
} from "../lib/youversion";
import { refreshTwiBible } from "../lib/bible";

/**
 * Connect the Twi Bible (YouVersion).
 *
 * One line when nothing is set up; opens into: paste the App Key → choose the
 * Twi edition the key is licensed for. Once chosen, "Twi" appears beside the
 * built-in Bibles and in each reading's Text list, so a Mass can be all Twi
 * or just its Gospel.
 */
export default function TwiBible({ onChange }) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(isConnected);
  const [version, setVersion] = useState(savedVersion);
  const [keyText, setKeyText] = useState("");
  const [versions, setVersions] = useState(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const run = async (label, fn) => {
    setError("");
    setBusy(label);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  };

  const loadVersions = async () => {
    const list = await twiVersions();
    setVersions(list);
    return list;
  };

  const pick = (id) =>
    run("Setting up…", async () => {
      const v = await chooseVersion(id);
      setVersion(v);
      refreshTwiBible();
      onChange?.(true);
    });

  const doConnect = () =>
    run("Checking the key…", async () => {
      await connect(keyText);
      setKeyText("");
      setConnected(true);
      const list = await loadVersions();
      // One licensed edition: nothing to choose.
      if (list.length === 1) {
        const v = await chooseVersion(list[0].id);
        setVersion(v);
        refreshTwiBible();
        onChange?.(true);
      }
    });

  const doDisconnect = () => {
    disconnect();
    refreshTwiBible();
    setConnected(false);
    setVersion(null);
    setVersions(null);
    onChange?.(false);
  };

  const ready = connected && version;

  return (
    <div className="twi-bible">
      <div className="field inline">
        <span>Twi Bible</span>
        <button
          className={`btn btn-ghost btn-sm${open ? " on" : ""}`}
          onClick={() => {
            const next = !open;
            setOpen(next);
            if (next && connected && !versions)
              run("Loading the Twi editions…", loadVersions);
          }}
        >
          {ready ? `✓ ${version.title}` : "Connect YouVersion…"}
        </button>
        {ready && !open && (
          <span className="muted small">
            Choose “Twi” above, or per reading under Text.
          </span>
        )}
      </div>

      {open && (
        <div className="twi-panel">
          {!connected && (
            <>
              <p className="muted small">
                The Twi Bible is licensed through YouVersion. Paste your free
                App Key from the YouVersion Platform; it stays on this computer
                and is never put in a service file or backup.
              </p>
              <div className="row">
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="YouVersion App Key"
                  value={keyText}
                  onChange={(e) => setKeyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && keyText && doConnect()}
                />
                <button
                  className="btn btn-sm"
                  disabled={!keyText.trim() || !!busy}
                  onClick={doConnect}
                >
                  Connect
                </button>
              </div>
            </>
          )}

          {connected && (
            <>
              {versions?.length > 0 && (
                <label className="field inline">
                  <span>Edition</span>
                  <select
                    value={version?.id ?? ""}
                    disabled={!!busy}
                    onChange={(e) => e.target.value && pick(e.target.value)}
                  >
                    <option value="">Choose a Twi Bible…</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {versions?.length === 0 && (
                <p className="muted small">
                  This key isn’t licensed for a Twi Bible yet. In the YouVersion
                  Platform portal, enable the Twi edition for your app, then
                  open this again.
                </p>
              )}
              {version?.copyright && (
                <p className="muted small">{version.copyright}</p>
              )}
              <p className="muted small">
                Readings are fetched once and kept on this computer, so build
                the Mass while online and it will project offline.{" "}
                <button className="link-btn" onClick={doDisconnect}>
                  Disconnect
                </button>
              </p>
            </>
          )}

          {(busy || error) && (
            <p className={`small ${error ? "twi-error" : "muted"}`} role="status">
              {error || busy}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
