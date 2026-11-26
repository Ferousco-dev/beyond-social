package alerts

import (
	"context"
	"errors"
	"testing"
)

type fakeSender struct {
	got []Alert
	err error
}

func (f *fakeSender) Send(_ context.Context, a Alert) error {
	f.got = append(f.got, a)
	return f.err
}

func TestEmailSenderSendsOnlyWhenAnAddressIsSet(t *testing.T) {
	var sentTo []string
	address := ""
	sender := &EmailSender{
		To: func(context.Context) string { return address },
		Mail: func(_ context.Context, to string, _ Alert) error {
			sentTo = append(sentTo, to)
			return nil
		},
	}
	if err := sender.Send(context.Background(), Alert{Provider: "kie"}); err != nil || len(sentTo) != 0 {
		t.Fatalf("sent with no address: %v %v", sentTo, err)
	}
	address = " ops@example.com "
	if err := sender.Send(context.Background(), Alert{Provider: "kie"}); err != nil || len(sentTo) != 1 || sentTo[0] != "ops@example.com" {
		t.Fatalf("sentTo = %v, err = %v", sentTo, err)
	}
	var empty *EmailSender
	if err := empty.Send(context.Background(), Alert{}); err != nil {
		t.Fatalf("an unset sender failed: %v", err)
	}
}

func TestSendersReachEveryoneEvenWhenOneFails(t *testing.T) {
	broken := &fakeSender{err: errors.New("webhook down")}
	working := &fakeSender{}
	err := Senders{broken, nil, working}.Send(context.Background(), Alert{Provider: "apify"})
	if err == nil || len(broken.got) != 1 || len(working.got) != 1 {
		t.Fatalf("err = %v, broken %d, working %d", err, len(broken.got), len(working.got))
	}
}
