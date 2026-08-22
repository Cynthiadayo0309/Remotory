import { WorkflowEntrypoint, WorkflowStep } from "cloudflare:workers";
import type { WorkflowEvent } from "cloudflare:workers";

import { createWorkersAiClient } from "@/server/ai/workers-ai-client";
import { createRepositories } from "@/server/db";
import {
  checkCompany,
  finalizeRetryableCompanyFailure,
  parseRetryableCheckFailure,
} from "@/server/workflows/check-company";
import {
  COMPANY_CHECK_STEP_CONFIG,
  COMPANY_UPDATE_BATCH_SIZE,
} from "@/server/workflows/constants";
import {
  decideCompanyUpdatePartState,
  ensureCompanyUpdateContinuation,
} from "@/server/workflows/continuation";
import { companyUpdateWorkflowParamsSchema } from "@/validation/update-run";
import type { z } from "zod";

export type CompanyUpdateWorkflowParams = z.infer<
  typeof companyUpdateWorkflowParamsSchema
>;

function safeWorkflowError(error: unknown): string {
  void error;
  return "一括確認Workflowに失敗しました";
}

export class CompanyUpdateWorkflow extends WorkflowEntrypoint<
  CloudflareEnv,
  CompanyUpdateWorkflowParams
> {
  async run(
    event: WorkflowEvent<CompanyUpdateWorkflowParams>,
    step: WorkflowStep,
  ) {
    const { runId, part } = companyUpdateWorkflowParamsSchema.parse(
      event.payload,
    );
    const repositories = createRepositories(this.env.DB);

    try {
      await step.do(`一括確認を開始 part ${part}`, async () => {
        await repositories.companyUpdateRuns.markRunning(
          runId,
          new Date().toISOString(),
        );
      });

      const companyIds = await step.do(
        `未処理企業を読み込む part ${part}`,
        async () =>
          repositories.companyUpdateRuns.listPendingTargetCompanyIds(
            runId,
            COMPANY_UPDATE_BATCH_SIZE,
          ),
      );

      for (const [index, companyId] of companyIds.entries()) {
        const label = `${index + 1}-${companyId}`;
        const checkId = await step.do(`確認を準備 ${label}`, async () =>
          repositories.companyUpdateRuns.prepareCheck(
            runId,
            companyId,
            new Date().toISOString(),
          ),
        );

        try {
          await step.do(
            `企業を確認 ${label}`,
            COMPANY_CHECK_STEP_CONFIG,
            async () => {
              const result = await checkCompany(
                this.env.DB,
                { companyId, checkId },
                { aiClient: createWorkersAiClient(this.env.AI) },
              );
              await repositories.companyUpdateRuns.recordProgress(
                runId,
                checkId,
                result,
              );
              return result;
            },
          );
        } catch (error) {
          const failure = parseRetryableCheckFailure(error);
          await step.do(`失敗を記録 ${label}`, async () => {
            const result = await finalizeRetryableCompanyFailure(this.env.DB, {
              checkId,
              failure,
            });
            await repositories.companyUpdateRuns.recordProgress(
              runId,
              checkId,
              result,
            );
            return result;
          });
        }
      }

      const state = await step.do(`進捗を確認 part ${part}`, async () => {
        const run = await repositories.companyUpdateRuns.findById(runId);
        if (!run) throw new Error("Company update run could not be loaded");
        const pendingCompanies =
          await repositories.companyUpdateRuns.countPendingTargets(runId);
        return {
          ...decideCompanyUpdatePartState(run, pendingCompanies),
          processedCompanies: run.processedCompanies,
          candidateCount: run.candidateCount,
        };
      });

      if (state.action === "continue") {
        const nextPart = part + 1;
        const continuation = await step.do(
          `次のpartを開始 ${nextPart}`,
          async () =>
            ensureCompanyUpdateContinuation(this.env.COMPANY_UPDATE_WORKFLOW, {
              runId,
              part: nextPart,
            }),
        );
        return {
          runId,
          part,
          processedCompanies: state.processedCompanies,
          candidateCount: state.candidateCount,
          pendingCompanies: state.pendingCompanies,
          nextInstanceId: continuation.id,
        };
      }

      const completed = await step.do(`一括確認を完了 part ${part}`, async () =>
        repositories.companyUpdateRuns.markCompleted(
          runId,
          new Date().toISOString(),
        ),
      );
      return {
        runId,
        part,
        processedCompanies: completed.processedCompanies,
        candidateCount: completed.candidateCount,
        pendingCompanies: 0,
        nextInstanceId: null,
      };
    } catch (error) {
      await step.do("一括確認の異常終了を記録", async () => {
        await repositories.companyUpdateRuns.markFailed(
          runId,
          safeWorkflowError(error),
          new Date().toISOString(),
        );
      });
      throw error;
    }
  }
}
