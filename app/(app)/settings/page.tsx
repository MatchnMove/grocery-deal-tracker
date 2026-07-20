import { Card, Field, inputClass } from "@/components/ui";
import { PasswordField } from "@/components/password-field";
import { updatePasswordAction, updateSettingsAction } from "@/lib/actions/settings";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await prisma.userSettings.findUniqueOrThrow({ where: { userId: user.id } });
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-ink/65">Private household, travel, loyalty and notification settings.</p>
      </div>
      <Card>
        <form action={updateSettingsAction} className="grid gap-3 sm:grid-cols-2">
          <Field label="Household size"><input className={inputClass} name="householdSize" type="number" defaultValue={settings.householdSize} /></Field>
          <Field label="Home location"><input className={inputClass} name="homeAddress" defaultValue={settings.homeAddress} /></Field>
          <Field label="Maximum distance km"><input className={inputClass} name="maxStoreDistanceKm" type="number" step="0.1" defaultValue={settings.maxStoreDistanceKm.toString()} /></Field>
          <Field label="Fuel economy L/100km"><input className={inputClass} name="fuelEconomyLitresPer100Km" type="number" step="0.1" defaultValue={settings.fuelEconomyLitresPer100Km.toString()} /></Field>
          <Field label="Fuel price per litre"><input className={inputClass} name="fuelPrice" inputMode="decimal" defaultValue={(settings.fuelPriceCentsPerLitre / 100).toFixed(2)} /></Field>
          <Field label="Minimum saving extra stop"><input className={inputClass} name="minimumSaving" inputMode="decimal" defaultValue={(settings.minimumSavingExtraStopCents / 100).toFixed(2)} /></Field>
          <Field label="Timezone"><input className={inputClass} name="timezone" defaultValue={settings.timezone} /></Field>
          <div className="grid gap-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="woolworthsRewards" value="true" defaultChecked={settings.woolworthsRewards} /> Woolworths Everyday Rewards</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="newWorldClubcard" value="true" defaultChecked={settings.newWorldClubcard} /> New World Clubcard</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="costcoMembership" value="true" defaultChecked={settings.costcoMembership} /> Costco membership</label>
          </div>
          <button className="touch-target rounded-md bg-leaf px-4 py-2 font-semibold text-white sm:col-span-2" type="submit">Save settings</button>
        </form>
      </Card>
      <Card>
        <form action={updatePasswordAction} className="grid max-w-md gap-3">
          <h2 className="text-lg font-semibold">Change Password</h2>
          <PasswordField minLength={12} />
          <button className="touch-target rounded-md bg-ink px-4 py-2 font-semibold text-white" type="submit">Update password</button>
        </form>
      </Card>
    </>
  );
}
