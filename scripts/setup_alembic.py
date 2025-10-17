"""
Setup Alembic migration for accounting module
"""
import os
import sys

# Update alembic.ini with correct database URL
alembic_ini_content = """# A generic, single database configuration.

[alembic]
script_location = db/migrations/alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = sqlite:///./ngi_capital.db

[post_write_hooks]

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARNING
handlers = console
qualname =

[logger_sqlalchemy]
level = WARNING
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
"""

# Update alembic/env.py to import our models
env_py_content = """from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context

# Import Base from models
import sys
sys.path.append('.')

from services.api.database import Base
from services.api import models
from services.api import models_accounting
from services.api import models_accounting_part2
from services.api import models_accounting_part3

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
"""

# Write the files
with open('alembic.ini', 'w') as f:
    f.write(alembic_ini_content)

os.makedirs('db/migrations/alembic', exist_ok=True)
with open('db/migrations/alembic/env.py', 'w') as f:
    f.write(env_py_content)

print("[OK] Alembic configuration updated")
print("Next: Run 'alembic revision --autogenerate -m \"Add accounting tables\"'")

