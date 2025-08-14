# Stripe Integration met Credits Systeem

## 🚀 **Overzicht**

Deze documentatie beschrijft de volledige integratie van Stripe met een credits systeem voor de AI App Builder. Elk bericht kost 1 credit, en gebruikers kunnen verschillende pakketten kiezen.

## 📦 **Pakketten & Pricing**

### **Gratis Pakket**
- **Prijs**: €0/maand
- **Credits**: 5 credits per maand
- **Features**: Basis AI App Builder functionaliteit

### **Pro Pakket**
- **Prijs**: €20/maand
- **Credits**: 100 credits per maand
- **Stripe Product ID**: `prod_SeQcDaKIsNyqND`
- **Stripe Price ID**: `price_1Rj7lWRv5cVaeSzxWDOvwU0E`
- **Features**: Alle gratis features + prioriteit support

### **Team Pakket**
- **Prijs**: €50/maand
- **Credits**: 400 credits per maand
- **Stripe Product ID**: `prod_SeQcqHUMMoVaSv`
- **Stripe Price ID**: `price_1Rj7leRv5cVaeSzx4kAEEI5t`
- **Features**: Alle Pro features + team collaboration

### **Enterprise Pakket**
- **Prijs**: €200/maand
- **Credits**: 2000 credits per maand
- **Stripe Product ID**: `prod_SeQduXvVSzMI8g`
- **Stripe Price ID**: `price_1Rj7loRv5cVaeSzx59JS9yY8`
- **Features**: Alle Team features + dedicated support + custom integrations

## 📁 **Documentatie Bestanden**

1. **[overview.md](./overview.md)** - Architectuur en systeem overzicht
2. **[database-schema.md](./database-schema.md)** - Database schema voor credits en subscriptions
3. **[stripe-setup.md](./stripe-setup.md)** - Stripe configuratie en webhook setup
4. **[credits-system.md](./credits-system.md)** - Credits management en tracking
5. **[subscription-management.md](./subscription-management.md)** - Abonnement beheer
6. **[billing-ui.md](./billing-ui.md)** - Frontend billing interface
7. **[api-endpoints.md](./api-endpoints.md)** - API endpoints voor billing
8. **[stack-auth-integration.md](./stack-auth-integration.md)** - Integratie met Stack Auth
9. **[testing.md](./testing.md)** - Test strategie en implementatie
10. **[deployment.md](./deployment.md)** - Deployment en environment setup

## 🔄 **Workflow**

```
User Registration → Choose Plan → Stripe Payment → Credits Allocation → Usage Tracking
```

## 🛠️ **Technische Stack**

- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Neon)
- **Payment**: Stripe
- **Auth**: Stack Auth
- **Frontend**: React + TypeScript
- **State Management**: React Query

## 🚀 **Quick Start**

1. Lees eerst [overview.md](./overview.md) voor architectuur
2. Volg [stripe-setup.md](./stripe-setup.md) voor Stripe configuratie
3. Implementeer database schema uit [database-schema.md](./database-schema.md)
4. Bouw credits systeem volgens [credits-system.md](./credits-system.md)
5. Voeg billing UI toe met [billing-ui.md](./billing-ui.md)

## 📊 **Monitoring**

- Credits usage tracking
- Subscription status monitoring
- Payment failure alerts
- Usage analytics

---

**Laatste Update**: $(date)
**Versie**: 1.0.0
**Compatibiliteit**: Stripe, Stack Auth, PostgreSQL
