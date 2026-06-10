from sonification_bridge.protocol import Reading, parse_line, format_line


def test_parse_basic_int():
    assert parse_line("1,light,128") == Reading("1", "light", 128)


def test_parse_negative_and_float():
    assert parse_line("1,accel_x,-204") == Reading("1", "accel_x", -204)
    r = parse_line("acc,temp,21.5")
    assert r == Reading("acc", "temp", 21.5)
    assert isinstance(r.val, float)


def test_whitespace_is_tolerated():
    assert parse_line("  2 , pot , 873 \n") == Reading("2", "pot", 873)


def test_comments_and_blanks_ignored():
    assert parse_line("# heartbeat") is None
    assert parse_line("") is None
    assert parse_line("   ") is None


def test_malformed_ignored():
    assert parse_line("only,two") is None
    assert parse_line("a,b,c,d") is None
    assert parse_line("1,light,notanumber") is None
    assert parse_line("1,,5") is None


def test_round_trip_format():
    r = Reading("1", "light", 128)
    assert format_line(r) == "1,light,128"
    assert parse_line(format_line(r)) == r
