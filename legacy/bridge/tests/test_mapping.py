from sonification_bridge.mapping import (
    MappingConfig,
    Rule,
    parse_rules,
    scale,
)
from sonification_bridge.protocol import Reading


def test_scale_basic():
    assert scale(128, (0, 256), (0.0, 1.0)) == 0.5
    assert scale(0, (0, 255), (60, 130)) == 60
    assert scale(255, (0, 255), (60, 130)) == 130


def test_scale_clamps_by_default():
    assert scale(-50, (0, 100), (0.0, 1.0)) == 0.0
    assert scale(150, (0, 100), (0.0, 1.0)) == 1.0


def test_scale_no_clamp_extrapolates():
    assert scale(150, (0, 100), (0.0, 1.0), clamp=False) == 1.5


def test_scale_degenerate_range():
    assert scale(5, (10, 10), (0.0, 1.0)) == 0.0


def test_rule_matching_and_wildcards():
    r = Rule(osc="/play/cutoff", in_range=(0, 255), out_range=(60, 130),
             src="1", chan="light")
    assert r.matches(Reading("1", "light", 100))
    assert not r.matches(Reading("2", "light", 100))
    assert not r.matches(Reading("1", "temp", 100))

    wild = Rule(osc="/x", in_range=(0, 1), out_range=(0, 1))  # src/chan None
    assert wild.matches(Reading("anything", "whatever", 0))


def test_config_messages_for_emits_per_matching_rule():
    rules = [
        Rule(osc="/play/cutoff", in_range=(0, 255), out_range=(60, 130),
             src="1", chan="light"),
        Rule(osc="/play/reverb", in_range=(-1024, 1024), out_range=(0.0, 1.0),
             src="1", chan="accel_x"),
    ]
    cfg = MappingConfig(rules=rules)

    msgs = cfg.messages_for(Reading("1", "light", 255))
    assert msgs == [("/play/cutoff", 130.0)]

    assert cfg.messages_for(Reading("9", "light", 1)) == []


def test_parse_rules_from_dicts():
    rules = parse_rules([
        {"match": {"src": 1, "chan": "light"}, "osc": "/play/cutoff",
         "in": [0, 255], "out": [60, 130]},
    ])
    assert len(rules) == 1
    assert rules[0].src == "1"  # coerced to str
    assert rules[0].osc == "/play/cutoff"
    assert rules[0].matches(Reading("1", "light", 10))
