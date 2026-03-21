from global_rates_store import RateStore, SUPPORTED_BCS


def test_snapshot_public_always_10_and_no_nulls():
    # FED collector OK; outros não implementados (devem virar stale mas sem quebrar)
    def fed_ok(_cb: str):
        return {
            "policy_name": "Fed Funds Target Range",
            "value_label": "5.25% – 5.50%",
            "effective_label": "",
        }

    store = RateStore(collectors={"FED": fed_ok})
    store.refresh_all()
    payload = store.snapshot_public()
    assert payload.get("success") is True
    rates = payload.get("rates")
    assert isinstance(rates, list)
    assert len(rates) == 10

    codes = [r.get("central_bank") for r in rates]
    assert codes == SUPPORTED_BCS

    for r in rates:
        # Nunca null
        assert r.get("central_bank") is not None
        assert r.get("policy_name") is not None
        assert r.get("value_label") is not None
        assert r.get("effective_label") is not None
        assert r.get("source") is not None
        assert r.get("last_success_label") is not None
        assert r.get("last_attempt_label") is not None
        assert r.get("is_stale") in (True, False)
        assert r.get("stale_reason") is not None
        assert r.get("error_count_rolling") is not None


def test_fed_failure_marks_stale_with_reason():
    def fed_fail(_cb: str):
        raise RuntimeError("parser broke")

    store = RateStore(collectors={"FED": fed_fail})
    store.refresh_one("FED")
    payload = store.snapshot_public()
    rates = payload["rates"]
    fed = next(r for r in rates if r["central_bank"] == "FED")
    assert fed["is_stale"] is True
    assert isinstance(fed["stale_reason"], str)
    assert fed["stale_reason"].strip() != ""


def test_override_applies_and_clears_stale():
    # FED auto falha, mas override deve forçar source=override e is_stale=false
    def fed_fail(_cb: str):
        raise RuntimeError("network down")

    store = RateStore(collectors={"FED": fed_fail})
    overrides = {
        "FED": {
            "policy_name": "Fed Funds Target Range",
            "value_label": "5.25% – 5.50%",
            "effective_label": "vigente a partir de 2026-01-29",
            "notes": "manual",
        }
    }
    store.refresh_one("FED", overrides=overrides)
    payload = store.snapshot_public()
    fed = next(r for r in payload["rates"] if r["central_bank"] == "FED")
    assert fed["source"] == "override"
    assert fed["is_stale"] is False
    assert fed["value_label"] == "5.25% – 5.50%"

