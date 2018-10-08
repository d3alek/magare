import json

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('node')
    parser.add_argument('db_info')
    args = parser.parse_args()

    node = 'couchdb@' + args.node
    db_info = json.loads(args.db_info)

    if node in db_info['by_node']:
        raise RuntimeError("Did not expect %s to be in by_node" % node)

    all_shards = next(iter(db_info['by_node'].values()))
    db_info['by_node'][node] = all_shards

    if node in db_info['by_range']:
        raise RuntimeError("Did not expect %s to be in by_range" % node)

    for shard in db_info['by_range'].keys():
        db_info['by_range'][shard].append(node)

    db_info['changelog'].insert(0, ['add', 'all-shards', node])
    
    print(json.dumps(db_info))
