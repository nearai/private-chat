import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { DomainVerification, VerificationInstructions } from "@/types/enterprise";
import { organizationClient } from "@/api/organization/client";
import { toast } from "sonner";
import {
  ClipboardIcon,
  CheckIcon,
  TrashIcon,
  ArrowPathIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface DomainVerificationWizardProps {
  onVerified?: (domain: DomainVerification) => void;
}

type Step = "list" | "add" | "verify";

export function DomainVerificationWizard({ onVerified }: DomainVerificationWizardProps) {
  const [step, setStep] = useState<Step>("list");
  const [domains, setDomains] = useState<DomainVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [verificationMethod, setVerificationMethod] = useState<"dns_txt" | "http_file">("dns_txt");
  const [verificationInstructions, setVerificationInstructions] = useState<VerificationInstructions | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsFetching(true);
    try {
      const response = await organizationClient.listDomains();
      setDomains(response.domains);
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    } finally {
      setIsFetching(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setIsLoading(true);
    try {
      const instructions = await organizationClient.addDomain({
        domain: newDomain.trim().toLowerCase(),
        verification_method: verificationMethod,
      });
      setVerificationInstructions(instructions);
      setStep("verify");
      toast.success("Domain added. Follow the instructions to verify ownership.");
      fetchDomains();
    } catch (error) {
      toast.error(`Failed to add domain: ${error}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomainId(domainId);
    try {
      const result = await organizationClient.verifyDomain(domainId);
      if (result.success) {
        toast.success("Domain verified successfully!");
        if (result.domain) {
          onVerified?.(result.domain);
        }
        fetchDomains();
        setStep("list");
        setVerificationInstructions(null);
      } else {
        toast.error(result.message || "Verification failed. Please check your DNS/file configuration.");
      }
    } catch (error) {
      toast.error(`Verification failed: ${error}`);
      console.error(error);
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm("Are you sure you want to remove this domain?")) return;

    try {
      await organizationClient.removeDomain(domainId);
      toast.success("Domain removed");
      fetchDomains();
    } catch (error) {
      toast.error(`Failed to remove domain: ${error}`);
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      verified: "bg-green-500/10 text-green-500",
      pending: "bg-yellow-500/10 text-yellow-500",
      failed: "bg-red-500/10 text-red-500",
      expired: "bg-gray-500/10 text-gray-500",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
      </div>
    );
  }

  // List view
  if (step === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-lg">Domain Verification</h3>
            <p className="text-muted-foreground text-sm">
              Verify your organization's domain to enable SAML SSO and automatic user provisioning.
            </p>
          </div>
          <Button onClick={() => setStep("add")}>Add Domain</Button>
        </div>

        {domains.length === 0 ? (
          <div className="rounded-lg border border-border border-dashed py-12 text-center">
            <GlobeAltIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No domains configured</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Add a domain to enable SAML SSO for users with matching email addresses.
            </p>
            <Button className="mt-4" onClick={() => setStep("add")}>
              Add Your First Domain
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(domain.status)}
                  <div>
                    <p className="font-medium">{domain.domain}</p>
                    <p className="text-muted-foreground text-sm">
                      Method: {domain.verification_method === "dns_txt" ? "DNS TXT Record" : "HTTP File"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm capitalize ${getStatusBadge(domain.status)}`}>
                    {domain.status}
                  </span>
                  {domain.status === "pending" && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => handleVerifyDomain(domain.id)}
                      disabled={verifyingDomainId === domain.id}
                    >
                      {verifyingDomainId === domain.id ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleRemoveDomain(domain.id)}
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Add domain form
  if (step === "add") {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => setStep("list")}
            className="text-muted-foreground text-sm hover:text-foreground"
          >
            &larr; Back to domains
          </button>
          <h3 className="mt-2 font-medium text-lg">Add Domain</h3>
          <p className="text-muted-foreground text-sm">
            Enter your domain and choose a verification method.
          </p>
        </div>

        <form onSubmit={handleAddDomain} className="space-y-4">
          <div>
            <label className="mb-1 block font-medium text-sm">Domain</label>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="mt-1 text-muted-foreground text-sm">
              Enter the domain without http:// or www.
            </p>
          </div>

          <div>
            <label className="mb-2 block font-medium text-sm">Verification Method</label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
                <input
                  type="radio"
                  name="verification_method"
                  value="dns_txt"
                  checked={verificationMethod === "dns_txt"}
                  onChange={() => setVerificationMethod("dns_txt")}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">DNS TXT Record</p>
                  <p className="text-muted-foreground text-sm">
                    Add a TXT record to your domain's DNS settings. Recommended for most users.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/50">
                <input
                  type="radio"
                  name="verification_method"
                  value="http_file"
                  checked={verificationMethod === "http_file"}
                  onChange={() => setVerificationMethod("http_file")}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium">HTTP File</p>
                  <p className="text-muted-foreground text-sm">
                    Upload a verification file to your web server's root directory.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep("list")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !newDomain.trim()}>
              {isLoading ? "Adding..." : "Add Domain"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Verification instructions
  if (step === "verify" && verificationInstructions) {
    return (
      <div className="space-y-6">
        <div>
          <button
            type="button"
            onClick={() => {
              setStep("list");
              setVerificationInstructions(null);
              setNewDomain("");
            }}
            className="text-muted-foreground text-sm hover:text-foreground"
          >
            &larr; Back to domains
          </button>
          <h3 className="mt-2 font-medium text-lg">Verify {verificationInstructions.domain}</h3>
          <p className="text-muted-foreground text-sm">
            Follow the instructions below to verify domain ownership.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <h4 className="mb-3 font-medium">Instructions</h4>
          <p className="whitespace-pre-wrap text-sm">{verificationInstructions.instructions}</p>
        </div>

        {verificationInstructions.verification_method === "dns_txt" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-muted-foreground text-sm">Record Type</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                  {verificationInstructions.dns_record_type || "TXT"}
                </code>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-muted-foreground text-sm">Record Name / Host</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                  {verificationInstructions.dns_record_name || `_nearai-verify.${verificationInstructions.domain}`}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(
                    verificationInstructions.dns_record_name || `_nearai-verify.${verificationInstructions.domain}`,
                    "dns_name"
                  )}
                  className="rounded p-2 hover:bg-muted"
                >
                  {copiedField === "dns_name" ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-muted-foreground text-sm">Record Value</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-sm">
                  {verificationInstructions.dns_record_value || verificationInstructions.expected_value}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(
                    verificationInstructions.dns_record_value || verificationInstructions.expected_value,
                    "dns_value"
                  )}
                  className="rounded p-2 hover:bg-muted"
                >
                  {copiedField === "dns_value" ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {verificationInstructions.verification_method === "http_file" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-muted-foreground text-sm">File Path</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 font-mono text-sm">
                  {verificationInstructions.http_path || `/.well-known/nearai-verification.txt`}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(
                    verificationInstructions.http_path || `/.well-known/nearai-verification.txt`,
                    "http_path"
                  )}
                  className="rounded p-2 hover:bg-muted"
                >
                  {copiedField === "http_path" ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-muted-foreground text-sm">File Content</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-3 py-2 font-mono text-sm">
                  {verificationInstructions.http_content || verificationInstructions.expected_value}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(
                    verificationInstructions.http_content || verificationInstructions.expected_value,
                    "http_content"
                  )}
                  className="rounded p-2 hover:bg-muted"
                >
                  {copiedField === "http_content" ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <p className="text-sm">
            <strong>Note:</strong> DNS changes can take up to 48 hours to propagate. If verification fails,
            please wait and try again later.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setStep("list");
              setVerificationInstructions(null);
              setNewDomain("");
            }}
          >
            I'll do this later
          </Button>
          <Button
            onClick={() => {
              const pendingDomain = domains.find(d => d.domain === verificationInstructions.domain);
              if (pendingDomain) {
                handleVerifyDomain(pendingDomain.id);
              }
            }}
            disabled={verifyingDomainId !== null}
          >
            {verifyingDomainId ? "Verifying..." : "Verify Now"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export default DomainVerificationWizard;
