import { createMongoAbility, type CreateAbility, type MongoAbility, AbilityBuilder } from '@casl/ability';
import { permissions } from './permisions';
import type { User } from './models/user';
import { userSubject } from './subjects/user';
import { projectSubject } from './subjects/project';
import { z } from 'zod'
import { organizationSubject } from './subjects/organization';
import { billingSubject } from './subjects/billing';
import { inviteSubject } from './subjects/invite';

export * from './models/organization'
export * from './models/project'
export * from './models/user'
export * from './roles'


const appAbilitiesSchema = z.union([
  projectSubject,
  userSubject,
  organizationSubject,
  billingSubject,
  inviteSubject,
  z.tuple([
    z.literal('manage'), z.literal('all')
  ])
])

type AppAbilities = z.infer<typeof appAbilitiesSchema>;

export type AppAbility = MongoAbility<AppAbilities>;
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>;

export function defineAbilityFor(user: User) {
  const builder = new AbilityBuilder(createAppAbility)

  if (typeof permissions[user.role] !== 'function') {
    throw new Error(`Permissions for ${user.role} role not found`)
  }

  permissions[user.role](user, builder)

  const ability = builder.build({
    detectSubjectType(subject) {
      return subject.__typename
    },
  })
  ability.can = ability.can.bind(ability)

  return ability
}