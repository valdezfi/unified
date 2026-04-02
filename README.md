### Env variables used--
create *.env* file
- UNIFIED_API_KEY=
- NEXT_PUBLIC_UNIFIED_WORKSPACE_ID=

### Local Development
```powershell
npm install
npm run dev
```
- runs on http://localhost:3000
- Hot reload enabled; edits to `.tsx`/`.ts` files auto-refresh
- API routes require server restart if changes touch Node globals

### Production Build
```powershell
npm run build  # generates .next/
npm run start  # runs production server
```
- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Type-checks via TypeScript in tsconfig.json (strict mode enabled)