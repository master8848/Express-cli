# Init Script

- [x] Change from where is lib folder to "is there a lib folder?"
- [x] after init script, create a sksn.config.json that has the following

  - using src folder? (this will be used for lib folder and file creation)
  - db type (pg, mysql, sqlite)
  - db driver (deployment) (neon, vercel, turso, planetscale) - think at the start doing neon, vercel, and planetscale

  - orm (drizzle or prisma) (starting with drizzle)

# Generate Script

- [x] add implementation that allows user to select what they would like to scaffold
- [] add form to create
- [x] add controller for trpc

- [] add logic to move root-domain thats in provider to .env
- [x] add update_Schema to the model

- [x] change init to only initialise config file -> then add drizzle to add ->

- [] add seed script
- [x] update script needs to stringify with null, 2
- [x] add provider automatically?
- [x] change queries and mutations to find items based on typeof id rather than on a fixed type (number)

- [x] add all remaining columns for drivers

## Relations

- [] add relation builder

# Next Auth

- [x] add next auth
- [x] add (is owned by user) to generate
