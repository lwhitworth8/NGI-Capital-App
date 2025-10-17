"""
Background Scheduler for Mercury Bank Auto-Sync
Runs Mercury transaction sync every hour for all active entities
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.api.database_async import get_async_session_factory
from services.api.models_accounting import AccountingEntity
from services.api.models_accounting_part2 import BankAccount
from services.api.services.mercury_sync_service import MercurySyncService

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


async def sync_all_mercury_accounts():
    """
    Background job to sync all Mercury accounts for all active entities
    Runs every hour
    """
    logger.info(f"[Mercury Auto-Sync] Starting hourly sync at {datetime.now()}")

    try:
        # Get async database session
        session_factory = get_async_session_factory()
        async with session_factory() as db:
            # Get all active entities with Mercury accounts
            result = await db.execute(
                select(BankAccount.entity_id)
                .where(BankAccount.auto_sync_enabled == True)
                .where(BankAccount.is_active == True)
                .where(BankAccount.bank_name == "Mercury")
                .distinct()
            )
            entity_ids = [row[0] for row in result.all()]

            logger.info(f"[Mercury Auto-Sync] Found {len(entity_ids)} entities with auto-sync enabled")

            # Sync each entity
            sync_results = []
            for entity_id in entity_ids:
                try:
                    sync_service = MercurySyncService(db)
                    result = await sync_service.sync_transactions(entity_id, days_back=7)

                    sync_results.append({
                        "entity_id": entity_id,
                        "success": result.get("success", False),
                        "synced": result.get("synced", 0),
                        "matched": result.get("matched", 0),
                        "created_drafts": result.get("created_drafts", 0)
                    })

                    if result.get("success"):
                        logger.info(
                            f"[Mercury Auto-Sync] Entity {entity_id}: "
                            f"Synced {result.get('synced', 0)} transactions, "
                            f"Matched {result.get('matched', 0)}, "
                            f"Created {result.get('created_drafts', 0)} drafts"
                        )
                    else:
                        logger.warning(
                            f"[Mercury Auto-Sync] Entity {entity_id} sync failed: "
                            f"{result.get('message', 'Unknown error')}"
                        )

                except Exception as e:
                    logger.error(f"[Mercury Auto-Sync] Error syncing entity {entity_id}: {str(e)}")
                    sync_results.append({
                        "entity_id": entity_id,
                        "success": False,
                        "error": str(e)
                    })

            # Summary
            successful = sum(1 for r in sync_results if r.get("success"))
            total_synced = sum(r.get("synced", 0) for r in sync_results)
            total_matched = sum(r.get("matched", 0) for r in sync_results)
            total_drafts = sum(r.get("created_drafts", 0) for r in sync_results)

            logger.info(
                f"[Mercury Auto-Sync] Completed: "
                f"{successful}/{len(entity_ids)} entities successful, "
                f"{total_synced} total transactions, "
                f"{total_matched} matched, "
                f"{total_drafts} drafts created"
            )

    except Exception as e:
        logger.error(f"[Mercury Auto-Sync] Fatal error in sync job: {str(e)}")


def start_scheduler():
    """
    Start the background scheduler for Mercury auto-sync
    Runs every hour on the hour
    """
    global scheduler

    if scheduler is not None:
        logger.warning("[Scheduler] Scheduler already running")
        return

    logger.info("[Scheduler] Initializing Mercury auto-sync scheduler")

    scheduler = AsyncIOScheduler()

    # Add hourly Mercury sync job
    scheduler.add_job(
        sync_all_mercury_accounts,
        trigger=IntervalTrigger(hours=1),
        id='mercury_hourly_sync',
        name='Mercury Bank Hourly Transaction Sync',
        replace_existing=True,
        max_instances=1  # Ensure only one instance runs at a time
    )

    scheduler.start()
    logger.info("[Scheduler] Mercury auto-sync scheduler started - running every hour")


def stop_scheduler():
    """
    Stop the background scheduler gracefully
    """
    global scheduler

    if scheduler is not None:
        logger.info("[Scheduler] Stopping scheduler")
        scheduler.shutdown(wait=True)
        scheduler = None
        logger.info("[Scheduler] Scheduler stopped")
    else:
        logger.warning("[Scheduler] No scheduler to stop")


def get_scheduler_status():
    """
    Get current scheduler status and job information
    """
    global scheduler

    if scheduler is None:
        return {
            "running": False,
            "jobs": []
        }

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger)
        })

    return {
        "running": True,
        "jobs": jobs
    }
