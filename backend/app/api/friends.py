from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser, get_current_user
from app.db import get_db
from app.limiter import limiter
from app.models import Friendship, User
from app.schemas import FriendAcceptIn, FriendRequestIn


router = APIRouter(prefix="/friends", tags=["friends"])


@router.post("/request")
@limiter.limit("10/minute")
async def request_friend(
    request: Request, payload: FriendRequestIn, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    if payload.user_id == current.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot friend yourself")

    other = await db.get(User, payload.user_id)
    if not other:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    q = select(Friendship).where(
        or_(
            and_(Friendship.requester_id == current.id, Friendship.addressee_id == payload.user_id),
            and_(Friendship.requester_id == payload.user_id, Friendship.addressee_id == current.id),
        )
    )
    existing = (await db.execute(q)).scalars().first()
    if existing:
        if existing.status == "accepted":
            return {"status": "already_friends"}
        if existing.requester_id == payload.user_id and existing.addressee_id == current.id and existing.status == "pending":
            existing.status = "accepted"
            await db.commit()
            return {"status": "accepted"}
        return {"status": existing.status}

    db.add(Friendship(requester_id=current.id, addressee_id=payload.user_id, status="pending"))
    await db.commit()
    return {"status": "pending"}


@router.post("/accept")
async def accept_friend(
    payload: FriendAcceptIn, current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    q = select(Friendship).where(
        Friendship.requester_id == payload.user_id,
        Friendship.addressee_id == current.id,
        Friendship.status == "pending",
    )
    friendship = (await db.execute(q)).scalars().first()
    if not friendship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending request")
    friendship.status = "accepted"
    await db.commit()
    return {"status": "accepted"}


@router.get("/pending")
async def list_pending_requests(
    current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict[str, list[dict[str, str]]]:
    q = select(Friendship).where(Friendship.addressee_id == current.id, Friendship.status == "pending")
    friendships = (await db.execute(q)).scalars().all()
    requester_ids = {f.requester_id for f in friendships}
    if not requester_ids:
        return {"pending": []}

    users = (await db.execute(select(User).where(User.id.in_(requester_ids)))).scalars().all()
    by_id = {u.id: u for u in users}
    return {
        "pending": [
            {"user_id": rid, "name": (by_id[rid].display_name or by_id[rid].name or rid) if rid in by_id else rid}
            for rid in requester_ids
        ]
    }


@router.get("")
async def list_friends(
    current: CurrentUser = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict[str, list[dict[str, str]]]:
    q = select(Friendship).where(
        Friendship.status == "accepted",
        or_(Friendship.requester_id == current.id, Friendship.addressee_id == current.id),
    )
    friendships = (await db.execute(q)).scalars().all()
    friend_ids: set[str] = set()
    for f in friendships:
        friend_ids.add(f.addressee_id if f.requester_id == current.id else f.requester_id)

    if not friend_ids:
        return {"friends": []}

    users = (await db.execute(select(User).where(User.id.in_(friend_ids)))).scalars().all()
    return {"friends": [{"id": u.id, "name": u.display_name or u.name or u.id} for u in users]}

