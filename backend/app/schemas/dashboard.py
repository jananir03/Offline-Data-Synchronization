from pydantic import BaseModel


class RecordStatusSummary(BaseModel):
    pending: int
    in_progress: int
    completed: int
    cancelled: int


class SyncSummary(BaseModel):
    total_operations: int
    successful_operations: int
    failed_operations: int
    conflict_operations: int


class DashboardSummaryResponse(BaseModel):
    total_records: int
    record_status: RecordStatusSummary
    sync: SyncSummary
    total_conflicts: int
