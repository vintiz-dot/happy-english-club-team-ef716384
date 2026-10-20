# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/aecc842e-6c64-4e59-b007-f586e2f9f9d6

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/aecc842e-6c64-4e59-b007-f586e2f9f9d6) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Reproducible installs (CI)

```sh
npm ci --ignore-scripts
```

`--ignore-scripts` is needed, and it is safe. `drizzle-kit` still depends
on the deprecated `@esbuild-kit/*` packages — even at 1.0.0-rc — and the
esbuild they pull in has a postinstall that fails on Windows under
`npm ci`, because it tries to run the platform binary before npm has
finished placing it. Skipping it costs nothing: esbuild's binary ships
inside its own `@esbuild/<platform>` package, and that postinstall only
verifies it. Verified after a `--ignore-scripts` install: esbuild, vite,
tsc and drizzle-kit all run, and `npm run build` produces a working
bundle.

Plain `npm i` does not need the flag.

`drizzle-kit` and `drizzle-orm` are pinned to exact versions rather than
ranges. drizzle-kit generates migration SQL, so two installs resolving
different minors could produce different output for the same schema; the
pins match what `bun.lock` already resolves, so npm and bun agree.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/aecc842e-6c64-4e59-b007-f586e2f9f9d6) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
