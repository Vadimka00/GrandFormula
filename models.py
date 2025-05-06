import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker, AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Text, Float, BigInteger
from sqlalchemy import Boolean
from sqlalchemy.orm import validates
from passlib.hash import argon2

load_dotenv()

class Base(AsyncAttrs, DeclarativeBase):
    """
    Base class for ORM models, combining AsyncAttrs and DeclarativeBase.
    """
    pass

class AdminUser(Base):
    __tablename__ = "admin_user"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    def verify_password(self, password: str) -> bool:
            return argon2.verify(password, self.password_hash)

    @staticmethod
    def hash_password(password: str) -> str:
        return argon2.hash(password)

class Metric(Base):
    __tablename__ = "metric"
    id: Mapped[int] = mapped_column(primary_key=True)
    metric_title: Mapped[str] = mapped_column(String(128), nullable=False)
    metric_value: Mapped[str] = mapped_column(String(64))
    currency: Mapped[str] = mapped_column(String(32), default="")
    tooltip: Mapped[str] = mapped_column(Text, nullable=True)

class Option(Base):
    __tablename__ = "option"
    id: Mapped[int] = mapped_column(primary_key=True)
    grand_generation: Mapped[int] = mapped_column(BigInteger, nullable=False)
    max_users: Mapped[int] = mapped_column(BigInteger, nullable=False)
    max_raiting: Mapped[float] = mapped_column(Float, nullable=False)
    max_mining_percent: Mapped[float] = mapped_column(Float, nullable=False)
    budget_percent: Mapped[float] = mapped_column(Float, nullable=False)
    referral_percent: Mapped[float] = mapped_column(Float, nullable=False)
    business_place_percent: Mapped[float] = mapped_column(Float, nullable=False)
    deposit_percent: Mapped[float] = mapped_column(Float, nullable=False)

# These will be initialized in app.py during startup
engine = None
async_session = None  # type: async_sessionmaker[AsyncSession]

def init_db():
    """
    Initialize the async engine and session factory using environment variable.
    Should be called within Quart's @before_serving handler.
    Returns:
        engine (AsyncEngine): The created async engine.
    """
    global engine, async_session
    database_url = os.getenv("SQLALCHEMY_DATABASE_URL")
    # Use aiomysql driver instead of mysqlconnector for async support
    database_url = database_url.replace(
        "mysql+mysqlconnector://", "mysql+aiomysql://"
    )
    # Create async engine tied to Quart's event loop
    engine = create_async_engine(
        database_url,
        echo=False,
        future=True
    )

    # Create session factory bound to this engine
    async_session = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    return engine
