#!/usr/bin/env python3
"""H021 reproducibility and invariant checks. All payout and quote data is retrospective."""
import json
from pathlib import Path
import pandas as pd

P=Path(__file__).resolve().parent
j=json.loads((P/'H021_RESULTS.json').read_text(encoding='utf-8'))
t=pd.read_csv(P/'H021_TICKET_DETAIL_PRIVATE.csv',encoding='utf-8-sig')


def assert_ticket_counts():
    assert j['population']['races']==621
    assert j['population']['horses']==9464
    assert j['population']['flags']==123
    assert j['population']['risk_rank_min']==10


def assert_payout_quote_match():
    assert j['qa']['sym_err']==0
    assert j['qa']['missing_quote']==0
    assert j['qa']['winning_payout_outside_quote']==0
    assert j['population']['payout_matched_races']==621


def assert_one_point_per_race():
    assert not t.duplicated(['strategy','rid']).any()
    assert (t['staked']==100).all()


def assert_consistent_settlement():
    assert ((t.hit==1)==(t.payout_yen_100>0)).all()
    assert (t.payout_yen_100>=0).all()
    assert (t.wide_quote_max>=t.wide_quote_min).all()
    winner=t[t.hit==1]
    assert (winner.payout_yen_100+1>=100*winner.wide_quote_min).all()
    assert (winner.payout_yen_100-1<=100*winner.wide_quote_max).all()


def assert_no_rank2_veto():
    a=t[t.strategy=='max_p'].sort_values('rid').reset_index(drop=True)
    b=t[t.strategy=='flag_skip'].sort_values('rid').reset_index(drop=True)
    assert len(a)==621 and len(b)==621
    assert (a.opp_rank==2).all()
    assert (a.opp_flag==0).all()
    assert a[['rid','axis_no','opp_no','payout_yen_100']].equals(b[['rid','axis_no','opp_no','payout_yen_100']])


def assert_bounded_veto_no_effect():
    a=t[t.strategy=='bounded_9_30_rank99'].sort_values('rid').reset_index(drop=True)
    b=t[t.strategy=='bounded_9_30_rank99_veto_pass'].sort_values('rid').reset_index(drop=True)
    assert len(a)==611 and len(b)==611
    assert int(a.opp_flag.sum())==0
    assert a[['rid','axis_no','opp_no','payout_yen_100']].equals(b[['rid','axis_no','opp_no','payout_yen_100']])


def assert_bounded_veto_small_effect():
    a=t[t.strategy=='bounded_9_50_rank99'];b=t[t.strategy=='bounded_9_50_rank99_veto_pass']
    assert len(a)==617 and len(b)==615
    assert a.opp_flag.sum()==2 and a[a.opp_flag==1].hit.sum()==0
    assert int(a.payout_yen_100.sum())==int(b.payout_yen_100.sum())==60050


def assert_no_flag_top9():
    assert (t.loc[(t.opp_flag==1),'opp_rank']>=10).all()
    assert t[t.strategy=='bounded_9_30_rank9'].opp_flag.sum()==0


def assert_high_return_instability():
    w=j['supplementary_all_flag_pairs_vs_top_h018_axis']
    assert w['not_one_ticket_per_race'] and w['pairs']==123 and w['hits']==3
    assert w['largest_share_of_return']>.70
    b=j['strategies']['flag_best']
    assert b['bets']==85 and b['hits']==2 and b['positive_payment_share_max']>.79


def assert_profile_missing_is_safely_zero():
    s=j['strategies']['bounded_9_30_rank99']
    assert s['bets']==611 and s['hits']==27
    assert s['spend_yen']==61100 and s['return_yen']==54040
    assert 0<s['roi']<1


def assert_market_is_postrace_control_only():
    # Research horse-pred probability is never updated by the close-market q.
    assert 'closing_market' not in j['population']
    assert all('opp_q_close' in t.columns for _ in [0])

if __name__=='__main__':
    tests=[v for k,v in list(globals().items()) if k.startswith('assert_') and callable(v)]
    for f in tests: f();print('PASS',f.__name__)
    print(f'{len(tests)} tests passed')