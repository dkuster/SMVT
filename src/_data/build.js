export default function () {
  const maintenant = new Date();
  return {
    annee: Number(new Intl.DateTimeFormat("fr-CH", { timeZone: "Europe/Zurich", year: "numeric" }).format(maintenant)),
    date: maintenant.toISOString(),
  };
}
