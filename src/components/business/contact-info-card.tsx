import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataProvenance } from "@/components/shared/data-provenance";
import { Phone, Globe, Camera, Users, Briefcase, AtSign, MapPin, Clock, Mail } from "lucide-react";
import type { Contact, BusinessLocation } from "@prisma/client";

const ICONS: Record<string, typeof Phone> = {
  PHONE: Phone,
  WHATSAPP: Phone,
  EMAIL: Mail,
  WEBSITE: Globe,
  INSTAGRAM: Camera,
  FACEBOOK: Users,
  LINKEDIN: Briefcase,
  TWITTER: AtSign,
  OTHER: Globe,
};

const LABELS: Record<string, string> = {
  PHONE: "Phone",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  WEBSITE: "Website",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
  TWITTER: "Twitter",
  OTHER: "Google Maps",
};

export function ContactInfoCard({ contacts, location, openingHours }: { contacts: Contact[]; location: BusinessLocation | null; openingHours: string[] | null }) {
  const hasEmail = contacts.some((c) => c.type === "EMAIL");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-5">
        {location?.addressFormatted && (
          <div className="flex items-start gap-2.5 text-sm">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>{location.addressFormatted}</span>
          </div>
        )}

        {contacts.map((contact) => {
          const Icon = ICONS[contact.type] ?? Globe;
          const isLink = ["WEBSITE", "INSTAGRAM", "FACEBOOK", "LINKEDIN", "TWITTER", "OTHER"].includes(contact.type);
          return (
            <div key={contact.id} className="flex items-start justify-between gap-2 text-sm">
              <div className="flex items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {isLink ? (
                  <a href={contact.value} target="_blank" rel="noreferrer" className="max-w-56 truncate text-primary hover:underline">
                    {LABELS[contact.type]}
                  </a>
                ) : (
                  <span>{contact.value}</span>
                )}
              </div>
              <DataProvenance confidence={contact.confidence} source={contact.source} />
            </div>
          );
        })}

        {!hasEmail && (
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Mail className="mt-0.5 size-4 shrink-0" />
            <span>No verified public email found.</span>
          </div>
        )}

        {openingHours && openingHours.length > 0 && (
          <div className="flex items-start gap-2.5 text-sm">
            <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="space-y-0.5">
              {openingHours.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
