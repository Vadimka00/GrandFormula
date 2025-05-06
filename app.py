from quart import Quart, jsonify, render_template, request
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import models
from models import Base, Option, Metric, init_db
from quart import jsonify
from dotenv import load_dotenv
import os
import json
import random
import asyncio
from models import AdminUser
from passlib.hash import argon2
from quart import session
from quart import redirect, url_for, session

load_dotenv()
app = Quart(__name__)
app.secret_key = os.getenv("SECRET_KEY")

# Создание таблиц

@app.before_serving
async def startup():
    # 1) Создаём engine и sessionmaker в правильном loop-е
    engine = init_db()
    app.engine = engine

    # 2) Тут models.async_session уже инициализирован init_db()
    app.async_session = models.async_session

    # 3) Создаём таблицы
    async with app.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.after_serving
async def shutdown():
    await app.engine.dispose()

def generate_users():
    users = random.randint(1_000, 10_000_000)
    return users

def generate_share_of_grand():
    avr_share = random.randint(1, 100)
    return avr_share

def generate_average_deposit():
    avr_deposit = random.randint(1, 100)
    return avr_deposit

def generate_average_subscribe():
    avr_subscribe = random.randint(1, 100)
    return avr_subscribe

def generate_raiting():
    values = [round(x * 0.1, 1) for x in range(10, 58)]  # от 1.0 до 5.7
    raiting = random.choice(values)
    return raiting


@app.route('/')
async def index():
    return await render_template('index.html')

@app.route("/admin/dashboard")
async def admin_dashboard():
    if "user_id" not in session:
        return await render_template('index.html')
    return await render_template("dashboard.html")

@app.route("/admin/logout")
async def admin_logout():
    session.pop("user_id", None)
    return await render_template('index.html')

@app.route("/admin/login", methods=["GET"])
async def admin_login_page():
    return await render_template("login.html")

@app.route("/admin/register", methods=["GET"])
async def admin_register_page():
    return await render_template("register.html")

@app.route('/admin/auth', methods=['POST'])
async def admin_login():
    data = await request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    async with app.async_session() as session_db:
        result = await session_db.execute(
            select(AdminUser).where(AdminUser.email == email)
        )
        user = result.scalar_one_or_none()

        if user and user.verify_password(password):
            session["user_id"] = user.id  # Сохраняем ID в сессии
            return jsonify({"message": "Успешный вход!"}), 200
        else:
            return jsonify({"error": "Неверные данные"}), 401

@app.route('/admin/create_user', methods=['POST'])
async def create_admin_user():
    data = await request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    hashed_password = AdminUser.hash_password(password)
    new_user = AdminUser(email=email, password_hash=hashed_password)

    async with app.async_session() as session:
        async with session.begin():
            session.add(new_user)

    return jsonify({"message": "Admin user created"}), 201

# PATCH для метрики
@app.route('/api/metrics/<int:item_id>', methods=['PATCH'])
async def patch_metric(item_id):
    data = await request.get_json()
    async with app.async_session() as session_db:
        async with session_db.begin():
            result = await session_db.execute(
                select(Metric).where(Metric.id == item_id)
            )
            metric = result.scalar_one_or_none()
            if not metric:
                return jsonify({'error': 'Not found'}), 404
            # Обновляем допустимые поля
            if 'metric_title' in data:
                metric.metric_title = data['metric_title']
            if 'metric_value' in data:
                metric.metric_value = data['metric_value']
            if 'currency' in data:
                metric.currency = data['currency']
            if 'tooltip' in data:
                metric.tooltip = data['tooltip']
    return jsonify({'success': True}), 200

# PATCH для настроек
@app.route('/api/options/<int:item_id>', methods=['PATCH'])
async def patch_option(item_id):
    data = await request.get_json()
    async with app.async_session() as session_db:
        async with session_db.begin():
            result = await session_db.execute(
                select(Option).where(Option.id == item_id)
            )
            option = result.scalar_one_or_none()
            if not option:
                return jsonify({'error': 'Not found'}), 404
            # Обновляем только числовые поля
            for field in [
                'grand_generation', 'max_users', 'max_raiting',
                'max_mining_percent', 'budget_percent',
                'referral_percent', 'business_place_percent', 'deposit_percent'
            ]:
                if field in data:
                    setattr(option, field, data[field])
    return jsonify({'success': True}), 200

# Маршрут получения всех настроек
@app.route('/api/options')
async def api_get_option():
    users = generate_users()
    raiting = generate_raiting()
    avr_share = generate_share_of_grand()
    avr_deposit = generate_average_deposit()
    avr_subscribe = generate_average_subscribe()

    # сессия теперь “рождается” в том же loop-е, что и Quart
    async with app.async_session() as session:
        async with session.begin():
            result = await session.execute(select(Option).limit(1))
        option = result.scalar_one_or_none()

    if not option:
        return jsonify({'error': 'Option not found'}), 404

    return jsonify({
        'max_users': option.max_users,
        'grand_generation': option.grand_generation,
        'max_raiting': option.max_raiting,
        'max_mining_percent': option.max_mining_percent,
        'budget_percent': option.budget_percent,
        'referral_percent': option.referral_percent,
        'business_place_percent': option.business_place_percent,
        'deposit_percent': option.deposit_percent,
        'users': users,
        'raiting': raiting,
        'avr_share': avr_share,
        'avr_deposit': avr_deposit,
        'avr_subscribe': avr_subscribe
    })

# Маршрут получения всех метрик
@app.route('/api/metrics')
async def api_get_metrics():
    # создаём сессию в текущем loop-е и автоматически возвращаем соединение в пул
    async with app.async_session() as session:
        async with session.begin():
            result = await session.execute(select(Metric))
        metrics = result.scalars().all()

    # собираем dict по заголовкам
    metric_dict = {m.metric_title: m for m in metrics}

    # читаем исходные метрики (подставляем "0", если нет записи)
    daily_birth      = int(metric_dict.get("Суточное рождение", Metric(metric_value="0")).metric_value)
    total_grand      = int(metric_dict.get("Всего Grand", Metric(metric_value="0")).metric_value)
    platform_budget  = int(metric_dict.get("Бюджет платформы", Metric(metric_value="0")).metric_value)
    global_budget    = int(metric_dict.get("Глобальный бюджет", Metric(metric_value="0")).metric_value)

    # пересчитываем
    new_total_grand     = total_grand + daily_birth
    new_platform_budget = platform_budget + daily_birth
    price_grand         = round(global_budget / new_total_grand, 4) if new_total_grand else 0

    # обновляем объекты в памяти (не пишем в БД)
    if "Всего Grand" in metric_dict:
        metric_dict["Всего Grand"].metric_value = str(new_total_grand)
    if "Бюджет платформы" in metric_dict:
        metric_dict["Бюджет платформы"].metric_value = str(new_platform_budget)
    if "Стоимость Grand" in metric_dict:
        m = metric_dict["Стоимость Grand"]
        m.metric_value = str(price_grand)
        m.currency     = "dollar"

    # готовим ответ
    result_list = [
        {
            "metric_id": m.id,
            "metric_title": m.metric_title,
            "metric_value": m.metric_value,
            "currency":     m.currency,
            "tooltip":      m.tooltip
        }
        for m in metric_dict.values()
    ]

    return jsonify(result_list)


# Симуляция

def generate_simulation(options):
    base_users = options.get("users", 10000000)
    base_raiting = options.get("raiting", 1.0)

    users = int(random.uniform(0.95, 1.05) * base_users)
    raiting = round(min(5.7, max(1.0, random.uniform(0.95, 1.05) * base_raiting)) * 10) / 10

    max_users = options.get("max_users", 150_000_000)
    max_raiting = options.get("max_raiting", 5.7)
    grand_generation = options.get("grand_generation", 10_000_000)

    max_mining_percent = options.get("max_mining_percent", 95)
    budget_percent = options.get("budget_percent", 5)
    referral_percent_base = options.get("referral_percent", 10)
    deposit_percent_base = options.get("deposit_percent", 5)
    business_place_percent_base = options.get("business_place_percent", 30)

    max_users_scaled = max_users * max_raiting
    online_users = users * raiting
    percent = 100 * (max_users_scaled - online_users) / (max_users_scaled - 100)

    mining_percent = max_mining_percent - ((((max_mining_percent - budget_percent) / 2) / 100) * percent)
    referral_percent = (referral_percent_base / 100) * percent
    deposit_percent = (deposit_percent_base / 100) * percent
    business_place_percent = (business_place_percent_base / 100) * percent

    mining_value = round(grand_generation * (mining_percent / 100), 4)
    referral_value = round(grand_generation * (referral_percent / 100), 4)
    budget_value = round(grand_generation * (budget_percent / 100), 4)
    deposit_value = round(grand_generation * (deposit_percent / 100), 4)
    business_place_value = round(grand_generation * (business_place_percent / 100), 4)

    return {
        "inputs": {
            "users": users,
            "raiting": raiting
        },
        "values": {
            "mining_value": mining_value,
            "referral_value": referral_value,
            "budget_value": budget_value,
            "deposit_value": deposit_value,
            "business_place_value": business_place_value
        },
        "percents": {
            "mining_percent": mining_percent,
            "referral_percent": referral_percent,
            "budget_percent": budget_percent,
            "deposit_percent": deposit_percent,
            "business_place_percent": business_place_percent
        }
    }

def average_simulations(simulations, options, sim_data):
    total = len(simulations)

    avg = {
        "inputs": {
            "users": 0,
            "raiting": 0
        },
        "values": {
            "mining_value": 0,
            "referral_value": 0,
            "budget_value": 0,
            "deposit_value": 0,
            "business_place_value": 0
        },
        "percents": {
            "mining_percent": 0,
            "referral_percent": 0,
            "budget_percent": 0,
            "deposit_percent": 0,
            "business_place_percent": 0
        }
    }

    for sim in simulations:
        avg["inputs"]["users"] += sim["inputs"]["users"]
        avg["inputs"]["raiting"] += sim["inputs"]["raiting"]
        for key in avg["percents"]:
            avg["percents"][key] += sim["percents"][key]
        for key in avg["values"]:
            avg["values"][key] += float(sim["values"][key])  # значения как строки → float

    # УСРЕДНЕНИЕ
    avg["inputs"]["users"] = round(avg["inputs"]["users"] / total, 4)
    avg["inputs"]["raiting"] = round(avg["inputs"]["raiting"] / total, 4)
    for key in avg["percents"]:
        avg["percents"][key] = round(avg["percents"][key] / total, 4)

    # СУММИРОВАННЫЕ values остаются как есть (без деления)

    # === Корректировка для 1 дня с sim_data ===
    if total == 1 and options and sim_data:
        last_entry = sim_data[-1] if isinstance(sim_data, list) and sim_data else None
        if last_entry:
            for key in avg["inputs"]:
                opt_val = options.get(key, 0)
                avg["inputs"][key] = round((avg["inputs"][key] + opt_val) / 2, 4)
            for key in avg["percents"]:
                prev_perc = float(last_entry["percents"].get(key, 0))
                avg["percents"][key] = round((avg["percents"][key] + prev_perc) / 2, 4)
            # values остаются как сумма за 1 день, без усреднения

    # Приводим значения обратно к строкам с округлением, если нужно
    for key in avg["values"]:
        avg["values"][key] = round(avg["values"][key], 4)

    return avg

@app.route('/api/calculate', methods=['POST'])
async def calculate():
    data = await request.get_json()
    options = data.get("options", {})
    sim_data = data.get("simData", [])
    offset = data.get("offset", {})

    grand_generation = 10000000

    d = offset.get("d", 0)
    w = offset.get("w", 0)
    m = offset.get("m", 0)
    y = offset.get("y", 0)

    total_days = y * 365 + m * 30 + w * 7 + d

    print(offset, total_days)

    total_grands = grand_generation * total_days

    # создаём сессию в текущем loop-е и автоматически возвращаем соединение в пул
    async with app.async_session() as session:
        async with session.begin():
            result = await session.execute(select(Metric))
        metrics = result.scalars().all()

    # собираем dict по заголовкам
    metric_dict = {m.metric_title: m for m in metrics}

    # читаем исходные метрики (подставляем "0", если нет записи)
    total_grand      = int(metric_dict.get("Всего Grand", Metric(metric_value="0")).metric_value)
    platform_budget  = int(metric_dict.get("Бюджет платформы", Metric(metric_value="0")).metric_value)

    # пересчитываем
    new_total_grand     = total_grand + total_grands + grand_generation
    new_platform_budget = platform_budget + total_grands + grand_generation

    if total_days == 0:
        return jsonify({"status": "error", "message": "Период не указан"}), 400

    if total_days > 1000:
        return jsonify({"status": "error", "message": "Слишком большой диапазон"}), 400

    simulations = [generate_simulation(options) for _ in range(total_days)]
    avg = average_simulations(simulations, options, sim_data)

    return jsonify({
        "status": "ok",
        "average": avg,
        "total_count": total_days,
        "grand_count": total_grands,
        "new_all_budget": new_total_grand,
        "new_platform_budget": new_platform_budget
    })


if __name__ == "__main__":
    app.run()