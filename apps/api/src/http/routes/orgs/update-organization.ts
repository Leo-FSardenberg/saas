import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { auth } from '@/http/middlewares/auth'
import { BadRequestError } from '../_errors/bad-request'
import { prisma } from '@/lib/prisma'
import { defineAbilityFor, organizationSchema, userSchema } from '@saas/auth'
import { UnauthorizedError } from "../_errors/unauthorized-error";
export async function updateOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(auth)
        .post(
            '/organizations/:slug',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Update an organization',
                    security: [{ bearerAuth: [] }],
                    body: z.object({
                        name: z.string(),
                        domain: z.string().nullish(),
                        shouldAttachUsersByDomain: z.boolean().optional(),
                    }),
                    params: z.object({
                        slug: z.string(),
                    }),
                    response: {
                        204: z.null()
                    }
                },
            },
            async (request, reply) => {

                const { slug } = await request.params
                const userId = await request.getCurrentUserId()
                const { membership, organization } = await request.getUserMembership(slug)
                const { name, domain, shouldAttachUsersByDomain } = request.body

                const authUser = userSchema.parse({
                    id: userId,
                    role: membership.role,
                })
                const authOrganization = organizationSchema.parse({ organization })

                const { cannot } = defineAbilityFor(authUser)

                if (cannot('update', authOrganization)) {
                    throw new UnauthorizedError(`You're not allowed to update this organization`)
                }

                if (domain) {
                    const organizationByDomain = await prisma.organization.findFirst({
                        where: {
                            domain, id: { not: organization.id }
                        },
                    })
                    if (organizationByDomain) {
                        throw new BadRequestError(
                            'Another organization with same domain already exists.',
                        )
                    }
                    await prisma.organization.update({
                        where: {
                            id: organization.id,
                        },
                        data: {
                            name,
                            domain,
                            shouldAttachUsersByDomain,
                        },
                    })
                }


                return reply.status(204).send()
            },
        )
}