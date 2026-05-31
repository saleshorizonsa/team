"use client";

import { useState } from "react";
import { Percent, Users, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommissionRulesForm } from "./commission-rules-form";
import { UsersManager } from "./users-manager";
import { CompanyForm } from "./company-form";
import type { ManagedUser } from "./settings-types";
import type { CommissionRules } from "@/lib/commission";
import type { CompanyInput } from "@/lib/validations";

interface Props {
  initialRules: CommissionRules;
  initialUsers: ManagedUser[];
  initialCompany: CompanyInput;
  currentUserId: string;
}

export function SettingsClient({ initialRules, initialUsers, initialCompany, currentUserId }: Props) {
  const [tab, setTab] = useState("commission");
  const [users, setUsers] = useState(initialUsers);

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Manage commission rules, users, and company info" />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="commission"><Percent className="h-3.5 w-3.5" /> Commission Rules</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="company"><Building2 className="h-3.5 w-3.5" /> Company</TabsTrigger>
        </TabsList>

        <TabsContent value="commission">
          <CommissionRulesForm initialRules={initialRules} users={users} />
        </TabsContent>

        <TabsContent value="users">
          <UsersManager initialUsers={users} onUsersChange={setUsers} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="company">
          <CompanyForm initial={initialCompany} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
